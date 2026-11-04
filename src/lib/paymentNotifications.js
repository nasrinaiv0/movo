import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const ID_BASE = 410000;
const MAX_DAYS = 30;
const dateAtLocalTime = (date, time) => {
  const [hour, minute] = String(time || '09:00').split(':').map(Number);
  const value = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour || 0, minute || 0, 0, 0);
  return value;
};
const inQuietHours = (date, start, end) => {
  if (!start || !end) return false;
  const toMinutes = value => { const [h,m] = value.split(':').map(Number); return h*60+m; };
  const now = date.getHours()*60+date.getMinutes(), a=toMinutes(start), b=toMinutes(end);
  return a===b ? false : a<b ? now>=a&&now<b : now>=a||now<b;
};
const moveOutOfQuietHours = (date, start, end) => {
  if (!inQuietHours(date,start,end)) return date;
  const [h,m]=String(end).split(':').map(Number);
  const next=new Date(date); next.setHours(h,m,0,0);
  if (next<=date) next.setDate(next.getDate()+1);
  return next;
};
const stableId = value => {
  let hash=2166136261;
  for (const ch of value) { hash^=ch.charCodeAt(0); hash=Math.imul(hash,16777619); }
  return ID_BASE + (hash>>>0)%1800000000;
};
const asDate = value => new Date(`${value}T12:00:00`);
const scheduledDates = item => {
  const dates=[item.scheduled_for];
  if(!['weekly','monthly','yearly'].includes(item.frequency))return dates;
  let cursor=asDate(item.scheduled_for);
  const originalDay=cursor.getDate();
  for(let i=0;i<8;i++){
    const next=new Date(cursor);
    if(item.frequency==='weekly')next.setDate(next.getDate()+7);
    if(item.frequency==='monthly'){
      next.setDate(1);next.setMonth(next.getMonth()+1);
      next.setDate(Math.min(originalDay,new Date(next.getFullYear(),next.getMonth()+1,0).getDate()));
    }
    if(item.frequency==='yearly')next.setFullYear(next.getFullYear()+1);
    const date=next.getFullYear()+'-'+String(next.getMonth()+1).padStart(2,'0')+'-'+String(next.getDate()).padStart(2,'0');
    if(item.ends_on&&date>item.ends_on)break;
    if(next.getTime()>Date.now()+(MAX_DAYS+30)*86400000)break;
    dates.push(date);cursor=next;
  }
  return dates;
};

export async function requestPaymentNotificationPermission() {
  if (!Capacitor.isNativePlatform()) return { supported:false, granted:false };
  let permission=await LocalNotifications.checkPermissions();
  if (permission.display!=='granted') permission=await LocalNotifications.requestPermissions();
  return { supported:true, granted:permission.display==='granted' };
}

export async function syncPaymentNotifications({ schedules=[], bills=[], subscriptions=[], preferences={} }={}) {
  if (!Capacitor.isNativePlatform()) return { supported:false, scheduled:0 };
  if (preferences.enabled===false || preferences.push_enabled!==true) {
    await LocalNotifications.cancel({notifications:(await LocalNotifications.getPending()).notifications.filter(n=>n.id>=ID_BASE&&n.id<ID_BASE+1800000000)});
    return { supported:true, scheduled:0 };
  }
  const permission=await LocalNotifications.checkPermissions();
  if(permission.display!=='granted') return {supported:true,scheduled:0,permissionRequired:true};
  const today=new Date(); const queue=[];
  const offsets=Array.isArray(preferences.reminder_days)?preferences.reminder_days:[0,1,3];
  const add=(type,item,date,days,title,body)=>{
    if(!date||!/^\d{4}-\d{2}-\d{2}$/.test(date))return;
    for(const offset of days){
      const due=asDate(date); due.setDate(due.getDate()-Number(offset));
      const fire=dateAtLocalTime(due,preferences.reminder_time||'09:00');
      const when=moveOutOfQuietHours(fire,preferences.quiet_start,preferences.quiet_end);
      if(when<=today||when.getTime()>today.getTime()+MAX_DAYS*86400000)continue;
      const key=`${type}:${item.id}:${date}:${offset}`;
      queue.push({id:stableId(key),title,body,schedule:{at:when,allowWhileIdle:true},extra:{type,sourceId:String(item.id),dueDate:date,offset}});
    }
  };
  schedules.filter(x=>x.status==='scheduled').forEach(x=>scheduledDates(x).forEach(date=>add('scheduled',x,date,x.reminder_days||offsets,'Payment reminder',`${x.title} is due ${date}.`)));
  bills.forEach(x=>add('bill',x,x.due_date,offsets,'Bill reminder',`${x.title||x.name||'A bill'} is due ${x.due_date}.`));
  subscriptions.filter(x=>x.status==='active').forEach(x=>add('subscription',x,x.start,offsets,'Subscription renewal',`${x.name||'A subscription'} renews ${x.start}.`));
  const pending=(await LocalNotifications.getPending()).notifications.filter(n=>n.id>=ID_BASE&&n.id<ID_BASE+1800000000);
  if(pending.length) await LocalNotifications.cancel({notifications:pending});
  queue.sort((a,b)=>a.schedule.at.getTime()-b.schedule.at.getTime());
  const selected=queue.slice(0,60);
  if(selected.length) await LocalNotifications.schedule({notifications:selected});
  return {supported:true,scheduled:selected.length,limited:queue.length>selected.length};
}

export async function cancelPaymentNotifications() {
  if (!Capacitor.isNativePlatform()) return;
  const pending=(await LocalNotifications.getPending()).notifications.filter(n=>n.id>=ID_BASE&&n.id<ID_BASE+1800000000);
  if(pending.length) await LocalNotifications.cancel({notifications:pending});
}

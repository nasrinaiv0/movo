import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const ID_BASE = 410000;
const MAX_DAYS = 30;
const datePartsInZone = (date,timeZone) => {
  if(!timeZone)return {year:date.getFullYear(),month:date.getMonth()+1,day:date.getDate()};
  const parts=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  return Object.fromEntries(parts.filter(x=>['year','month','day'].includes(x.type)).map(x=>[x.type,Number(x.value)]));
};
const dateString = ({year,month,day}) => `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
const shiftCalendarDate = (value,days) => {
  const [year,month,day]=value.split('-').map(Number);
  const shifted=new Date(Date.UTC(year,month-1,day+days));
  return dateString({year:shifted.getUTCFullYear(),month:shifted.getUTCMonth()+1,day:shifted.getUTCDate()});
};
export const dateAtLocalTime = (dateValue,time,timeZone) => {
  const dateParts=typeof dateValue==='string'?(()=>{const [year,month,day]=dateValue.split('-').map(Number);return {year,month,day};})():datePartsInZone(dateValue,timeZone);
  const [hour,minute]=String(time||'09:00').split(':').map(Number);
  const desired=Date.UTC(dateParts.year,dateParts.month-1,dateParts.day,hour||0,minute||0,0,0);
  if(!timeZone)return new Date(desired);
  let guess=desired;
  for(let i=0;i<4;i++){
    const parts=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(guess));
    const actual=Object.fromEntries(parts.filter(x=>['year','month','day','hour','minute','second'].includes(x.type)).map(x=>[x.type,Number(x.value)]));
    const represented=Date.UTC(actual.year,actual.month-1,actual.day,actual.hour,actual.minute,actual.second);
    const delta=desired-represented;
    if(delta===0)break;
    guess+=delta;
  }
  return new Date(guess);
};
export const inQuietHours = (date, start, end, timeZone) => {
  if (!start || !end) return false;
  let hour=date.getHours(),minute=date.getMinutes();
  if(timeZone){
    try{
      const parts=new Intl.DateTimeFormat('en-US',{timeZone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
      hour=Number(parts.find(x=>x.type==='hour')?.value??hour);
      minute=Number(parts.find(x=>x.type==='minute')?.value??minute);
    }catch{/* Fall back to the device timezone if the saved timezone is invalid. */}
  }
  const toMinutes=value=>{const [h,m]=value.split(':').map(Number);return h*60+m;};
  const now=hour*60+minute,a=toMinutes(start),b=toMinutes(end);
  return a===b?false:a<b?now>=a&&now<b:now>=a||now<b;
};
export const moveOutOfQuietHours = (date,start,end,timeZone) => {
  let next=new Date(date);
  for(let i=0;i<24*60&&inQuietHours(next,start,end,timeZone);i++)next=new Date(next.getTime()+60000);
  return next;
};
const stableId = value => {
  let hash=2166136261;
  for (const ch of value) { hash^=ch.charCodeAt(0); hash=Math.imul(hash,16777619); }
  return ID_BASE + (hash>>>0)%1800000000;
};
const asDate = value => new Date(`${value}T12:00:00`);
export const scheduledDates = item => {
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
    dates.push(date);cursor=next;
  }
  return dates;
};

export async function canSchedulePaymentNotifications() {
  if (!Capacitor.isNativePlatform()) return false;
  try { return (await LocalNotifications.checkPermissions()).display === 'granted'; } catch { return false; }
}

export async function requestPaymentNotificationPermission() {
  if (!Capacitor.isNativePlatform()) return { supported:false, granted:false };
  let permission=await LocalNotifications.checkPermissions();
  if (permission.display!=='granted') permission=await LocalNotifications.requestPermissions();
  return { supported:true, granted:permission.display==='granted' };
}

export async function syncPaymentNotifications({ schedules=[], bills=[], subscriptions=[], loans=[], receivables=[], cards=[], preferences={}, events=[] }={}) {
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
      const dueDate=shiftCalendarDate(date,-Number(offset));
      const todayDate=dateString(datePartsInZone(today,preferences.timezone));
      if(dueDate<=todayDate&&Number(offset)>0)continue;
      if(dueDate<shiftCalendarDate(todayDate,-MAX_DAYS))continue;
      const fire=dateAtLocalTime(dueDate,preferences.reminder_time||'09:00',preferences.timezone);
      let when=moveOutOfQuietHours(fire,preferences.quiet_start,preferences.quiet_end,preferences.timezone);
      if(when<=today)when=moveOutOfQuietHours(new Date(today.getTime()+60000),preferences.quiet_start,preferences.quiet_end,preferences.timezone);
      if(when.getTime()>today.getTime()+MAX_DAYS*86400000)continue;
      const previous=events.find(event=>event.channel==='push'&&event.source_type===type&&event.source_id===String(item.id)&&event.occurrence_date===date&&(Number(event.reminder_offset)===Number(offset)||(event.status==='dismissed'&&event.snoozed_until&&new Date(event.snoozed_until)>today)));
      if(previous&&(previous.status==='sent'||(previous.status==='dismissed'&&previous.snoozed_until&&new Date(previous.snoozed_until)>today)))continue;
      const key=`${type}:${item.id}:${date}:${offset}`;
      queue.push({id:stableId(key),title,body,schedule:{at:when,allowWhileIdle:true},extra:{type,sourceId:String(item.id),dueDate:date,offset}});
    }
  };
  schedules.filter(x=>x.status==='scheduled'&&(!x.snoozed_until||new Date(x.snoozed_until)<=today)).forEach(x=>scheduledDates(x).forEach(date=>add('scheduled',x,date,x.reminder_days||offsets,'Payment reminder',`${x.title} is due ${date}.`)));
  bills.forEach(x=>add('bill',x,x.due_date,offsets,'Bill reminder',`${x.title||x.name||'A bill'} is due ${x.due_date}.`));
  subscriptions.filter(x=>x.status==='active').forEach(x=>add('subscription',x,x.start,offsets,'Subscription renewal',`${x.name||'A subscription'} renews ${x.start}.`));
  loans.filter(x=>Number(x.outstanding_principal)>0).forEach(x=>add('loan',x,x.due_date,offsets,'Loan payment due',`${x.name||'A loan'} is due ${x.due_date}.`));
  receivables.filter(x=>Number(x.outstanding_amount)>0).forEach(x=>add('receivable',x,x.due_date,offsets,'Money owed to you',`${x.name||'A receivable'} is due ${x.due_date}.`));
  cards.filter(x=>Number(x.amount)>0).forEach(x=>add('credit_card',x,x.due_date,offsets,'Credit card payment due',`${x.name||'A credit card'} payment is due ${x.due_date}.`));
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

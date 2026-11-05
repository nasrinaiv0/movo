import { isReminderActioned, reminderActionKey, reminderEventAllowsDisplay, reminderOccurrenceAllowsDisplay } from './paymentReminderCenter';

describe('persistent reminder actions',()=>{
  const entry={kind:'bill',item:{id:'bill-1'},date:'2026-11-05'};
  test('uses a stable key for one occurrence, not every future cycle',()=>{
    expect(reminderActionKey(entry)).toBe('bill:bill-1:2026-11-05');
    expect(reminderActionKey({...entry,date:'2026-12-05'})).not.toBe(reminderActionKey(entry));
  });
  test('only suppresses the occurrence with an explicit saved action',()=>{
    expect(isReminderActioned(entry,{})).toBe(false);
    expect(isReminderActioned(entry,{'bill:bill-1:2026-11-05':{status:'skipped'}})).toBe(true);
    expect(isReminderActioned({...entry,date:'2026-12-05'},{'bill:bill-1:2026-11-05':{status:'skipped'}})).toBe(false);
  });
  test('shows sent reminders again on app open but respects skip and snooze',()=>{
    expect(reminderEventAllowsDisplay(null)).toBe(true);
    expect(reminderEventAllowsDisplay({status:'sent'})).toBe(true);
    expect(reminderEventAllowsDisplay({status:'dismissed'})).toBe(false);
    expect(reminderEventAllowsDisplay({status:'snoozed',snoozed_until:'2099-01-01T00:00:00.000Z'})).toBe(false);
    expect(reminderEventAllowsDisplay({status:'snoozed',snoozed_until:'2000-01-01T00:00:00.000Z'})).toBe(true);
  });
  test('skip and snooze suppress every reminder offset for the same due occurrence',()=>{
    const events=[{channel:'in_app',source_type:'bill',source_id:'bill-1',occurrence_date:'2026-11-05',reminder_offset:1,status:'dismissed'}];
    expect(reminderOccurrenceAllowsDisplay(events,entry,0)).toBe(false);
    const snoozed=[{...events[0],status:'snoozed',snoozed_until:'2099-01-01T00:00:00.000Z'}];
    expect(reminderOccurrenceAllowsDisplay(snoozed,entry,0)).toBe(false);
    expect(reminderOccurrenceAllowsDisplay([{...events[0],status:'sent'}],entry,0)).toBe(true);
  });
});

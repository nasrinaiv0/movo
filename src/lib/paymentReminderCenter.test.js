import { isReminderActioned, reminderActionKey, reminderEventAllowsDisplay } from './paymentReminderCenter';

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
});

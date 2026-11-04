jest.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }));
jest.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    checkPermissions: jest.fn(async () => ({ display: 'granted' })),
    requestPermissions: jest.fn(async () => ({ display: 'granted' })),
    getPending: jest.fn(async () => ({ notifications: [] })),
    cancel: jest.fn(async () => ({})),
    schedule: jest.fn(async () => ({})),
  },
}));

import { LocalNotifications } from '@capacitor/local-notifications';
import { inQuietHours, moveOutOfQuietHours, scheduledDates, syncPaymentNotifications } from './paymentNotifications';

const localDate = value => {
  const y=value.getFullYear(),m=String(value.getMonth()+1).padStart(2,'0'),d=String(value.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
};

describe('payment notification scheduling', () => {
  beforeEach(() => jest.clearAllMocks());

  test('detects quiet hours that cross midnight', () => {
    expect(inQuietHours(new Date(2026,10,4,23,30),'22:00','07:00')).toBe(true);
    expect(inQuietHours(new Date(2026,10,4,6,30),'22:00','07:00')).toBe(true);
    expect(inQuietHours(new Date(2026,10,4,12,0),'22:00','07:00')).toBe(false);
  });

  test('moves a quiet-hour reminder to the next allowed local time', () => {
    const moved=moveOutOfQuietHours(new Date(2026,10,4,23,30),'22:00','07:00');
    expect(moved.getFullYear()).toBe(2026);
    expect(moved.getMonth()).toBe(10);
    expect(moved.getDate()).toBe(5);
    expect(moved.getHours()).toBe(7);
    expect(moved.getMinutes()).toBe(0);
  });

  test('evaluates quiet hours in the saved timezone', () => {
    const instant=new Date('2026-11-04T14:30:00.000Z'); // 22:30 in Manila
    expect(inQuietHours(instant,'22:00','07:00','Asia/Manila')).toBe(true);
    const moved=moveOutOfQuietHours(instant,'22:00','07:00','Asia/Manila');
    expect(moved.toISOString()).toBe('2026-11-04T23:00:00.000Z'); // 07:00 next day in Manila
  });

  test('keeps monthly recurrence on the last valid day of shorter months', () => {
    const dates=scheduledDates({scheduled_for:'2026-01-31',frequency:'monthly'});
    expect(dates.slice(0,3)).toEqual(['2026-01-31','2026-02-28','2026-03-31']);
  });

  test('schedules configured reminders on native devices', async () => {
    const due=new Date(); due.setDate(due.getDate()+4);
    const result=await syncPaymentNotifications({
      schedules:[{id:'schedule-1',status:'scheduled',frequency:'once',scheduled_for:localDate(due),reminder_days:[2],title:'Internet bill'}],
      preferences:{enabled:true,push_enabled:true,reminder_days:[0,1,3]},
    });
    expect(result.supported).toBe(true);
    expect(result.scheduled).toBe(1);
    expect(LocalNotifications.schedule).toHaveBeenCalledTimes(1);
    expect(LocalNotifications.schedule.mock.calls[0][0].notifications[0].title).toBe('Payment reminder');
  });

  test('cancels MOVO reminders when the user disables them', async () => {
    LocalNotifications.getPending.mockResolvedValue({notifications:[{id:410001},{id:7}]});
    const result=await syncPaymentNotifications({preferences:{enabled:false,push_enabled:true}});
    expect(result.scheduled).toBe(0);
    expect(LocalNotifications.cancel).toHaveBeenCalledWith({notifications:[{id:410001}]});
  });
});

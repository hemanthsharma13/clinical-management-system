import { DateTime } from 'luxon';
import { buildDaySlots, classifySlot, parseClinicSlot, slotKeyFor, SlotState, SlotValidationError } from './slot';

const ZONE = 'Asia/Kolkata';
const NOW = DateTime.fromISO('2026-10-02T08:00:00', { zone: ZONE });

describe('clinic slots', () => {
  it('builds 16 half-hour slots from 09:00 through 16:30', () => {
    const slots = buildDaySlots('2026-10-05', ZONE);
    expect(slots).toHaveLength(16);
    expect(slots[0].localIso).toBe('2026-10-05T09:00');
    expect(slots[15].localIso).toBe('2026-10-05T16:30');
    expect(slots[0].start.toISOString()).toBe('2026-10-05T03:30:00.000Z');
    expect(slots[0].end.toISOString()).toBe('2026-10-05T04:00:00.000Z');
  });

  it('rejects a calendar date that does not exist', () => {
    expect(() => buildDaySlots('2026-02-31', ZONE)).toThrow(SlotValidationError);
  });

  it('accepts a clinic-local timestamp and rejects misaligned or closed times', () => {
    const slot = parseClinicSlot('2026-10-05T09:30', ZONE, NOW);
    expect(slot.start.toISOString()).toBe('2026-10-05T04:00:00.000Z');

    expect(() => parseClinicSlot('2026-10-05T09:15', ZONE, NOW)).toThrow(/:00 or :30/);
    expect(() => parseClinicSlot('2026-10-05T08:30', ZONE, NOW)).toThrow(/09:00/);
    expect(() => parseClinicSlot('2026-10-05T17:00', ZONE, NOW)).toThrow(/16:30/);
    const later = DateTime.fromISO('2026-10-02T12:00:00', { zone: ZONE });
    expect(() => parseClinicSlot('2026-10-02T09:00', ZONE, later)).toThrow(/future/);
  });

  it('converts an offset timestamp into the clinic zone before checking the grid', () => {
    const slot = parseClinicSlot('2026-10-05T03:30:00.000Z', ZONE, NOW);
    expect(slot.localIso).toBe('2026-10-05T09:00');
  });

  it('classifies booked slots ahead of past slots and builds a stable slot key', () => {
    const start = new Date('2026-10-05T03:30:00.000Z');
    expect(classifySlot(start, true, ZONE, NOW)).toBe(SlotState.BOOKED);
    expect(classifySlot(new Date('2026-10-01T03:30:00.000Z'), false, ZONE, NOW)).toBe(SlotState.PAST);
    expect(classifySlot(start, false, ZONE, NOW)).toBe(SlotState.AVAILABLE);
    expect(slotKeyFor('D201', start)).toBe('D201|2026-10-05T03:30:00.000Z');
  });
});

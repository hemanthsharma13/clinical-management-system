import { DateTime } from 'luxon';

export const SLOT_MINUTES = 30;
export const CLINIC_OPEN_MINUTES = 9 * 60;
export const CLINIC_LAST_START_MINUTES = 16 * 60 + 30;

export enum SlotState {
  AVAILABLE = 'AVAILABLE',
  BOOKED = 'BOOKED',
  PAST = 'PAST',
}

export class SlotValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SlotValidationError';
  }
}

export interface ClinicSlot {
  /** Clinic-local wall time without a zone suffix: yyyy-MM-dd'T'HH:mm */
  localIso: string;
  start: Date;
  end: Date;
}

export function slotKeyFor(doctorId: string, start: Date): string {
  return `${doctorId}|${start.toISOString()}`;
}

export function buildDaySlots(date: string, timeZone: string): ClinicSlot[] {
  const day = DateTime.fromISO(date, { zone: timeZone });
  if (!day.isValid || day.toISODate() !== date) {
    throw new SlotValidationError('Date must be a real calendar date in YYYY-MM-DD form.');
  }

  const slots: ClinicSlot[] = [];
  for (let minutes = CLINIC_OPEN_MINUTES; minutes <= CLINIC_LAST_START_MINUTES; minutes += SLOT_MINUTES) {
    const zoned = day.set({
      hour: Math.floor(minutes / 60),
      minute: minutes % 60,
      second: 0,
      millisecond: 0,
    });
    slots.push({
      localIso: zoned.toFormat("yyyy-MM-dd'T'HH:mm"),
      start: zoned.toUTC().toJSDate(),
      end: zoned.plus({ minutes: SLOT_MINUTES }).toUTC().toJSDate(),
    });
  }
  return slots;
}

/**
 * Accepts a clinic-local timestamp (`2026-10-05T09:30`) or an offset timestamp.
 * Offset timestamps are converted into the clinic zone and must still land on a slot.
 */
export function parseClinicSlot(isoInput: string, timeZone: string, now: DateTime = DateTime.now()): ClinicSlot {
  const iso = isoInput.trim();
  const hasZone = /(?:Z|[+-]\d{2}:\d{2})$/.test(iso);
  const inClinic = hasZone
    ? DateTime.fromISO(iso, { setZone: true }).setZone(timeZone)
    : DateTime.fromISO(iso, { zone: timeZone });

  if (!inClinic.isValid) {
    throw new SlotValidationError('Appointment date and time is not a valid date.');
  }
  if (inClinic.second !== 0 || inClinic.millisecond !== 0 || (inClinic.minute !== 0 && inClinic.minute !== 30)) {
    throw new SlotValidationError('Appointments are 30 minutes and must start at :00 or :30.');
  }

  const startMinutes = inClinic.hour * 60 + inClinic.minute;
  if (startMinutes < CLINIC_OPEN_MINUTES || startMinutes > CLINIC_LAST_START_MINUTES) {
    throw new SlotValidationError('Clinic hours are 09:00–17:00. The last appointment starts at 16:30.');
  }
  if (inClinic <= now.setZone(timeZone)) {
    throw new SlotValidationError('Appointments must be booked in the future.');
  }

  return {
    localIso: inClinic.toFormat("yyyy-MM-dd'T'HH:mm"),
    start: inClinic.toUTC().toJSDate(),
    end: inClinic.plus({ minutes: SLOT_MINUTES }).toUTC().toJSDate(),
  };
}

export function classifySlot(start: Date, taken: boolean, timeZone: string, now: DateTime = DateTime.now()): SlotState {
  if (taken) {
    return SlotState.BOOKED;
  }
  const zoned = DateTime.fromJSDate(start, { zone: 'utc' }).setZone(timeZone);
  if (zoned <= now.setZone(timeZone)) {
    return SlotState.PAST;
  }
  return SlotState.AVAILABLE;
}

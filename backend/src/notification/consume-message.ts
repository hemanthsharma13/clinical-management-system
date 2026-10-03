import {
  APPOINTMENT_BOOKED_EVENT,
  APPOINTMENT_BOOKED_VERSION,
  AppointmentBookedEvent,
} from '../contracts/appointment-booked.event';

export class PermanentEventError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermanentEventError';
  }
}

export type ConsumeDecision =
  | { type: 'process'; event: AppointmentBookedEvent }
  | { type: 'discard'; reason: string; raw: string };

export function inspectMessage(value: Buffer | null): ConsumeDecision {
  if (!value || value.length === 0) {
    return { type: 'discard', reason: 'empty-message', raw: '' };
  }
  const raw = value.toString('utf8');
  try {
    return { type: 'process', event: parseAppointmentEvent(raw) };
  } catch (error) {
    if (error instanceof PermanentEventError || error instanceof SyntaxError) {
      return { type: 'discard', reason: error.message, raw };
    }
    throw error;
  }
}

export function parseAppointmentEvent(raw: string): AppointmentBookedEvent {
  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed)) {
    throw new PermanentEventError('Event body must be an object.');
  }
  if (parsed.eventType !== APPOINTMENT_BOOKED_EVENT) {
    throw new PermanentEventError('Unexpected event type.');
  }
  if (typeof parsed.eventVersion !== 'string' || !parsed.eventVersion.startsWith(`${major(APPOINTMENT_BOOKED_VERSION)}.`)) {
    throw new PermanentEventError(`Unsupported event version: ${String(parsed.eventVersion)}.`);
  }
  if (typeof parsed.eventId !== 'string' || parsed.eventId.length === 0) {
    throw new PermanentEventError('Event id is required.');
  }
  if (parsed.producer !== 'appointment-module') {
    throw new PermanentEventError('Unexpected event producer.');
  }
  if (!isRecord(parsed.payload)) {
    throw new PermanentEventError('Event payload is required.');
  }
  const payload = parsed.payload;
  for (const field of ['appointmentId', 'patientId', 'patientName', 'doctorId', 'doctorName', 'startTime', 'endTime']) {
    if (typeof payload[field] !== 'string' || payload[field].length === 0) {
      throw new PermanentEventError(`Event payload field ${field} is required.`);
    }
  }
  return parsed as unknown as AppointmentBookedEvent;
}

function major(version: string): string {
  return version.split('.')[0] ?? '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

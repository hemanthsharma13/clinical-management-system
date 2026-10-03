export const APPOINTMENT_BOOKED_EVENT = 'AppointmentBooked';
export const APPOINTMENT_BOOKED_VERSION = '1.0';

export interface AppointmentBookedEvent {
  eventId: string;
  eventType: typeof APPOINTMENT_BOOKED_EVENT;
  eventVersion: string;
  occurredAt: string;
  producer: 'appointment-module';
  payload: {
    appointmentId: string;
    patientId: string;
    patientName: string;
    doctorId: string;
    doctorName: string;
    startTime: string;
    endTime: string;
  };
}

export interface AppointmentEventSource {
  eventId: string;
  appointmentId: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  startTime: Date | string;
  endTime: Date | string;
  createdAt?: Date | string;
}

/** Retries reuse this snapshot so the published body stays stable. */
export function toAppointmentBookedEvent(source: AppointmentEventSource): AppointmentBookedEvent {
  const occurred = source.createdAt ? new Date(source.createdAt) : new Date(source.startTime);
  return {
    eventId: source.eventId,
    eventType: APPOINTMENT_BOOKED_EVENT,
    eventVersion: APPOINTMENT_BOOKED_VERSION,
    occurredAt: occurred.toISOString(),
    producer: 'appointment-module',
    payload: {
      appointmentId: source.appointmentId,
      patientId: source.patientId,
      patientName: source.patientName,
      doctorId: source.doctorId,
      doctorName: source.doctorName,
      startTime: new Date(source.startTime).toISOString(),
      endTime: new Date(source.endTime).toISOString(),
    },
  };
}

export function confirmationMessage(patientId: string, doctorId: string): string {
  return `Appointment booked successfully for Patient ${patientId} with Doctor ${doctorId}.`;
}

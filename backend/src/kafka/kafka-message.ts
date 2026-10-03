import { AppointmentBookedEvent } from '../contracts/appointment-booked.event';

export interface KafkaOutboundMessage {
  key: string;
  value: string;
  headers: Record<string, string>;
}

export function toKafkaMessage(event: AppointmentBookedEvent): KafkaOutboundMessage {
  return {
    key: event.payload.appointmentId,
    value: JSON.stringify(event),
    headers: {
      'event-type': event.eventType,
      'event-version': event.eventVersion,
      'event-id': event.eventId,
    },
  };
}

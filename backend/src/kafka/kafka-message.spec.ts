import { toKafkaMessage } from './kafka-message';

describe('toKafkaMessage', () => {
  it('keys the record by appointment and carries version headers', () => {
    const message = toKafkaMessage({
      eventId: 'evt-1',
      eventType: 'AppointmentBooked',
      eventVersion: '1.0',
      occurredAt: '2026-10-02T04:00:00.000Z',
      producer: 'appointment-module',
      payload: {
        appointmentId: 'A1001',
        patientId: 'P101',
        patientName: 'Asha Verma',
        doctorId: 'D201',
        doctorName: 'Dr. Ananya Rao',
        startTime: '2026-10-05T03:30:00.000Z',
        endTime: '2026-10-05T04:00:00.000Z',
      },
    });

    expect(message.key).toBe('A1001');
    expect(message.headers['event-type']).toBe('AppointmentBooked');
    expect(message.headers['event-version']).toBe('1.0');
    expect(JSON.parse(message.value).eventId).toBe('evt-1');
  });
});

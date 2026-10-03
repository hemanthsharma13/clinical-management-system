import { confirmationMessage } from '../contracts/appointment-booked.event';
import { inspectMessage, PermanentEventError } from './consume-message';
import { NotificationService } from './notification.service';

const event = {
  eventId: 'evt-1',
  eventType: 'AppointmentBooked' as const,
  eventVersion: '1.0',
  occurredAt: '2026-10-02T04:00:00.000Z',
  producer: 'appointment-module' as const,
  payload: {
    appointmentId: 'A1001',
    patientId: 'P101',
    patientName: 'Asha Verma',
    doctorId: 'D201',
    doctorName: 'Dr. Ananya Rao',
    startTime: '2026-10-05T03:30:00.000Z',
    endTime: '2026-10-05T04:00:00.000Z',
  },
};

describe('appointment event consumption', () => {
  it('accepts version 1.x and rejects a new major version or bad json', () => {
    const decision = inspectMessage(Buffer.from(JSON.stringify(event)));
    expect(decision.type).toBe('process');

    const nextMinor = inspectMessage(Buffer.from(JSON.stringify({ ...event, eventVersion: '1.1' })));
    expect(nextMinor.type).toBe('process');

    const major = inspectMessage(Buffer.from(JSON.stringify({ ...event, eventVersion: '2.0' })));
    expect(major).toMatchObject({ type: 'discard' });

    const junk = inspectMessage(Buffer.from('not-json'));
    expect(junk).toMatchObject({ type: 'discard', reason: expect.stringContaining('JSON') });
    expect(new PermanentEventError('x').name).toBe('PermanentEventError');
  });

  it('records one notification and treats a repeated event id as a duplicate', async () => {
    const notifications = { create: jest.fn() };
    const service = new NotificationService(notifications as never);
    notifications.create.mockResolvedValueOnce({ eventId: 'evt-1' });
    notifications.create.mockRejectedValueOnce({ code: 11000 });

    await expect(service.recordFromEvent(event)).resolves.toBe('created');
    await expect(service.recordFromEvent(event)).resolves.toBe('duplicate');
    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({
        message: confirmationMessage('P101', 'D201'),
        eventId: 'evt-1',
      }),
    );
  });
});

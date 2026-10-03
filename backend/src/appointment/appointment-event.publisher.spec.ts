import { ConfigService } from '@nestjs/config';
import { LocalAppointmentBus } from '../events/local-appointment-bus';
import { KafkaService } from '../kafka/kafka.service';
import { AppointmentEventPublisher } from './appointment-event.publisher';
import { AppointmentStatus, OutboxStatus } from './appointment.schema';

describe('AppointmentEventPublisher', () => {
  const appointments = {
    findOneAndUpdate: jest.fn(),
    updateOne: jest.fn(),
  };
  const kafka = { isEnabled: jest.fn(), publish: jest.fn() };
  const bus = { dispatch: jest.fn() };
  const config = { get: jest.fn().mockReturnValue('all') };

  const publisher = new AppointmentEventPublisher(
    appointments as never,
    kafka as unknown as KafkaService,
    bus as unknown as LocalAppointmentBus,
    config as unknown as ConfigService,
  );

  const claimed = {
    appointmentId: 'A1001',
    eventId: 'evt-1',
    patientId: 'P101',
    patientName: 'Asha Verma',
    doctorId: 'D201',
    doctorName: 'Dr. Ananya Rao',
    startTime: new Date('2026-10-05T03:30:00.000Z'),
    endTime: new Date('2026-10-05T04:00:00.000Z'),
    createdAt: new Date('2026-10-02T04:00:00.000Z'),
    status: AppointmentStatus.BOOKED,
    outboxStatus: OutboxStatus.PUBLISHING,
    publishAttempts: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    config.get.mockReturnValue('all');
    appointments.findOneAndUpdate.mockResolvedValue(claimed);
    appointments.updateOne.mockResolvedValue({ acknowledged: true });
  });

  it('publishes a stable AppointmentBooked event when Kafka is enabled', async () => {
    kafka.isEnabled.mockReturnValue(true);
    kafka.publish.mockResolvedValue(undefined);

    await publisher.publishById('A1001');

    expect(kafka.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'evt-1',
        eventType: 'AppointmentBooked',
        eventVersion: '1.0',
        occurredAt: '2026-10-02T04:00:00.000Z',
        payload: expect.objectContaining({ patientId: 'P101', doctorId: 'D201', appointmentId: 'A1001' }),
      }),
    );
    expect(bus.dispatch).not.toHaveBeenCalled();
    expect(appointments.updateOne).toHaveBeenCalledWith(
      { appointmentId: 'A1001', outboxStatus: OutboxStatus.PUBLISHING },
      expect.objectContaining({ $set: { outboxStatus: OutboxStatus.PUBLISHED } }),
    );
  });

  it('leaves the event pending when the broker rejects the publish', async () => {
    kafka.isEnabled.mockReturnValue(true);
    kafka.publish.mockRejectedValue(new Error('broker down'));

    await publisher.publishById('A1001');

    expect(appointments.updateOne).toHaveBeenCalledWith(
      { appointmentId: 'A1001', outboxStatus: OutboxStatus.PUBLISHING },
      expect.objectContaining({
        $set: expect.objectContaining({ outboxStatus: OutboxStatus.PENDING, lastPublishError: 'broker down' }),
      }),
    );
  });

  it('does not publish when another worker already claimed the appointment', async () => {
    appointments.findOneAndUpdate.mockResolvedValue(null);
    await publisher.publishById('A1001');
    expect(kafka.publish).not.toHaveBeenCalled();
    expect(bus.dispatch).not.toHaveBeenCalled();
  });

  it('uses the in-process bus only when Kafka is disabled', async () => {
    kafka.isEnabled.mockReturnValue(false);
    bus.dispatch.mockResolvedValue(undefined);
    await publisher.publishById('A1001');
    expect(bus.dispatch).toHaveBeenCalled();
    expect(kafka.publish).not.toHaveBeenCalled();
  });
});

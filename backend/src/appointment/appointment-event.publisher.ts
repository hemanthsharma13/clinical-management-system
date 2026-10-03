import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { toAppointmentBookedEvent } from '../contracts/appointment-booked.event';
import { LocalAppointmentBus } from '../events/local-appointment-bus';
import { KafkaService } from '../kafka/kafka.service';
import { Appointment, AppointmentDocument, AppointmentStatus, MAX_PUBLISH_ATTEMPTS, OutboxStatus } from './appointment.schema';

const CLAIM_TIMEOUT_MS = 60_000;

@Injectable()
export class AppointmentEventPublisher {
  private readonly logger = new Logger(AppointmentEventPublisher.name);

  constructor(
    @InjectModel(Appointment.name) private readonly appointments: Model<Appointment>,
    private readonly kafka: KafkaService,
    private readonly bus: LocalAppointmentBus,
    private readonly config: ConfigService,
  ) {}

  async publishById(appointmentId: string): Promise<void> {
    const role = this.config.get<string>('processRole') ?? 'all';
    if (role === 'worker') {
      return;
    }

    const staleBefore = new Date(Date.now() - CLAIM_TIMEOUT_MS);
    const claimed = await this.appointments.findOneAndUpdate(
      {
        appointmentId,
        status: AppointmentStatus.BOOKED,
        publishAttempts: { $lt: MAX_PUBLISH_ATTEMPTS },
        $or: [
          { outboxStatus: OutboxStatus.PENDING },
          { outboxStatus: OutboxStatus.PUBLISHING, publishingStartedAt: { $lt: staleBefore } },
        ],
      },
      { $set: { outboxStatus: OutboxStatus.PUBLISHING, publishingStartedAt: new Date() } },
      { new: true },
    );
    if (!claimed) {
      return;
    }

    try {
      const event = toAppointmentBookedEvent(claimed);
      if (this.kafka.isEnabled()) {
        await this.kafka.publish(event);
      } else {
        await this.bus.dispatch(event);
      }
      await this.appointments.updateOne(
        { appointmentId, outboxStatus: OutboxStatus.PUBLISHING },
        { $set: { outboxStatus: OutboxStatus.PUBLISHED }, $unset: { lastPublishError: 1 }, $inc: { publishAttempts: 1 } },
      );
    } catch (error) {
      const attempts = (claimed.publishAttempts ?? 0) + 1;
      const message = error instanceof Error ? error.message : 'Unknown publish error';
      this.logger.error(`Failed to publish appointment ${appointmentId}: ${message}`);
      await this.appointments.updateOne(
        { appointmentId, outboxStatus: OutboxStatus.PUBLISHING },
        {
          $set: {
            outboxStatus: attempts >= MAX_PUBLISH_ATTEMPTS ? OutboxStatus.FAILED : OutboxStatus.PENDING,
            lastPublishError: message,
          },
          $inc: { publishAttempts: 1 },
        },
      );
    }
  }

  async resetForRetry(appointmentId: string): Promise<AppointmentDocument | null> {
    return this.appointments.findOneAndUpdate(
      { appointmentId, status: AppointmentStatus.BOOKED, outboxStatus: OutboxStatus.FAILED },
      { $set: { outboxStatus: OutboxStatus.PENDING, publishAttempts: 0 }, $unset: { lastPublishError: 1 } },
      { new: true },
    );
  }
}

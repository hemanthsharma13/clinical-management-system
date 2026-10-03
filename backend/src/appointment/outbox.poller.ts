import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Appointment, AppointmentStatus, MAX_PUBLISH_ATTEMPTS, OutboxStatus } from './appointment.schema';
import { AppointmentEventPublisher } from './appointment-event.publisher';

@Injectable()
export class OutboxPoller implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxPoller.name);
  private timer: NodeJS.Timeout | undefined;
  private flushing = false;

  constructor(
    @InjectModel(Appointment.name) private readonly appointments: Model<Appointment>,
    private readonly publisher: AppointmentEventPublisher,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    const role = this.config.get<string>('processRole') ?? 'all';
    if (role === 'worker') {
      return;
    }
    const interval = this.config.get<number>('outboxPollMs') ?? 5000;
    this.timer = setInterval(() => {
      void this.flush();
    }, interval);
    this.timer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async flush(): Promise<void> {
    if (this.flushing) {
      return;
    }
    this.flushing = true;
    try {
      const staleBefore = new Date(Date.now() - 60_000);
      const pending = await this.appointments
        .find({
          status: AppointmentStatus.BOOKED,
          publishAttempts: { $lt: MAX_PUBLISH_ATTEMPTS },
          $or: [
            { outboxStatus: OutboxStatus.PENDING },
            { outboxStatus: OutboxStatus.PUBLISHING, publishingStartedAt: { $lt: staleBefore } },
          ],
        })
        .select('appointmentId')
        .limit(20)
        .lean();

      for (const item of pending) {
        await this.publisher.publishById(item.appointmentId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown outbox error';
      this.logger.error(`Outbox flush failed: ${message}`);
    } finally {
      this.flushing = false;
    }
  }
}

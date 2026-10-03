import { Injectable } from '@nestjs/common';
import { AppointmentBookedEvent } from '../contracts/appointment-booked.event';

/**
 * Development stand-in used only when KAFKA_ENABLED=false.
 * The notification module registers the same handler it uses for Kafka messages.
 */
@Injectable()
export class LocalAppointmentBus {
  private handler: ((event: AppointmentBookedEvent) => Promise<void>) | null = null;

  setHandler(handler: (event: AppointmentBookedEvent) => Promise<void>): void {
    this.handler = handler;
  }

  async dispatch(event: AppointmentBookedEvent): Promise<void> {
    if (!this.handler) {
      throw new Error('The notification handler is not registered yet.');
    }
    await this.handler(event);
  }
}

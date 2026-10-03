import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Consumer, EachMessagePayload } from 'kafkajs';
import { LocalAppointmentBus } from '../events/local-appointment-bus';
import { KafkaService } from '../kafka/kafka.service';
import { inspectMessage } from './consume-message';
import { NotificationService } from './notification.service';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class NotificationConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationConsumer.name);
  private consumer: Consumer | null = null;
  private stopped = false;

  constructor(
    private readonly kafka: KafkaService,
    private readonly notifications: NotificationService,
    private readonly bus: LocalAppointmentBus,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    const role = this.config.get<string>('processRole') ?? 'all';
    if (!this.kafka.isEnabled()) {
      if (role === 'worker') {
        this.logger.log('Kafka is disabled and PROCESS_ROLE=worker, so this process is idle.');
        return;
      }
      this.bus.setHandler(async (event) => {
        await this.notifications.recordFromEvent(event);
      });
      this.logger.log('Kafka is disabled. Notifications are recorded through the in-process bus.');
      return;
    }
    if (role === 'api') {
      this.logger.log('PROCESS_ROLE=api. This process publishes events and does not consume them.');
      return;
    }
    void this.start();
  }

  async onModuleDestroy(): Promise<void> {
    this.stopped = true;
    if (this.consumer) {
      await this.consumer.disconnect();
    }
  }

  private async start(): Promise<void> {
    let delay = 1000;
    while (!this.stopped) {
      try {
        const consumer = this.kafka.createConsumer();
        this.consumer = consumer;
        consumer.on(consumer.events.CRASH, (event) => {
          this.logger.error(`Notification consumer crashed: ${event.payload.error.message}`);
        });
        await consumer.connect();
        await consumer.subscribe({ topic: this.kafka.topic(), fromBeginning: true });
        await consumer.run({
          autoCommit: false,
          eachMessage: async (payload) => this.handle(consumer, payload),
        });
        this.logger.log(`Notification consumer subscribed to ${this.kafka.topic()}`);
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown Kafka error';
        this.logger.error(`Notification consumer could not start: ${message}. Retrying in ${delay}ms.`);
        await sleep(delay);
        delay = Math.min(delay * 2, 30_000);
      }
    }
  }

  private async handle(consumer: Consumer, payload: EachMessagePayload): Promise<void> {
    const decision = inspectMessage(payload.message.value);
    if (decision.type === 'discard') {
      await this.kafka.publishRawToDlq(decision.raw, decision.reason);
      await this.commit(consumer, payload);
      this.logger.warn(`Discarded appointment event (${decision.reason}) and wrote it to the dead-letter topic.`);
      return;
    }

    await this.notifications.recordFromEvent(decision.event);
    await this.commit(consumer, payload);
  }

  private async commit(consumer: Consumer, payload: EachMessagePayload): Promise<void> {
    const nextOffset = (BigInt(payload.message.offset) + 1n).toString();
    await consumer.commitOffsets([
      { topic: payload.topic, partition: payload.partition, offset: nextOffset },
    ]);
  }
}

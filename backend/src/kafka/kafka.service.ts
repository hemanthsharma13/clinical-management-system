import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Consumer, Kafka, Producer } from 'kafkajs';
import { AppointmentBookedEvent } from '../contracts/appointment-booked.event';
import { toKafkaMessage } from './kafka-message';

@Injectable()
export class KafkaService implements OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private readonly enabled: boolean;
  private readonly kafka: Kafka | null;
  private producer: Producer | null = null;
  private connecting: Promise<Producer> | null = null;

  constructor(private readonly config: ConfigService) {
    this.enabled = this.config.get<boolean>('kafka.enabled') ?? false;
    if (!this.enabled) {
      this.kafka = null;
      return;
    }
    this.kafka = new Kafka({
      clientId: this.config.get<string>('kafka.clientId') ?? 'clinic-appointment-system',
      brokers: this.config.get<string[]>('kafka.brokers') ?? [],
      retry: { retries: 8, initialRetryTime: 300 },
    });
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  topic(): string {
    return this.config.get<string>('kafka.topic') ?? 'appointment.booked';
  }

  dlqTopic(): string {
    return `${this.topic()}.dlq`;
  }

  async publish(event: AppointmentBookedEvent): Promise<void> {
    const producer = await this.getProducer();
    await producer.send({
      topic: this.topic(),
      messages: [toKafkaMessage(event)],
    });
  }

  async publishRawToDlq(raw: string, reason: string, key = 'unknown'): Promise<void> {
    const producer = await this.getProducer();
    await producer.send({
      topic: this.dlqTopic(),
      messages: [{ key, value: raw, headers: { reason } }],
    });
  }

  createConsumer(): Consumer {
    if (!this.kafka) {
      throw new Error('Kafka is disabled.');
    }
    return this.kafka.consumer({
      groupId: this.config.get<string>('kafka.groupId') ?? 'notification-service',
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.producer) {
      await this.producer.disconnect();
    }
  }

  private async getProducer(): Promise<Producer> {
    if (!this.kafka) {
      throw new Error('Kafka is disabled.');
    }
    if (this.producer) {
      return this.producer;
    }
    if (!this.connecting) {
      this.connecting = this.connectProducer();
    }
    return this.connecting;
  }

  private async connectProducer(): Promise<Producer> {
    if (!this.kafka) {
      throw new Error('Kafka is disabled.');
    }
    const producer = this.kafka.producer({
      idempotent: this.config.get<boolean>('kafka.idempotent') ?? true,
      allowAutoTopicCreation: true,
    });
    await producer.connect();
    this.producer = producer;
    this.logger.log('Kafka producer connected');
    return producer;
  }
}

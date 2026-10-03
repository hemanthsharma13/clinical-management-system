import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export enum AppointmentStatus {
  BOOKED = 'BOOKED',
  CANCELLED = 'CANCELLED',
}

export enum OutboxStatus {
  PENDING = 'PENDING',
  PUBLISHING = 'PUBLISHING',
  PUBLISHED = 'PUBLISHED',
  FAILED = 'FAILED',
}

export const MAX_PUBLISH_ATTEMPTS = 10;

@Schema({ collection: 'appointments', timestamps: true })
export class Appointment {
  @Prop({ required: true, unique: true })
  appointmentId!: string;

  @Prop({ required: true })
  patientId!: string;

  @Prop({ required: true })
  patientName!: string;

  @Prop({ required: true })
  doctorId!: string;

  @Prop({ required: true })
  doctorName!: string;

  @Prop({ required: true })
  specialization!: string;

  @Prop({ required: true })
  startTime!: Date;

  @Prop({ required: true })
  endTime!: Date;

  @Prop({ required: true, enum: Object.values(AppointmentStatus) })
  status!: AppointmentStatus;

  /**
   * Set only while status is BOOKED. A unique sparse index makes the slot
   * claim atomic: two concurrent inserts cannot share a doctor and start time.
   * Cancellation unsets the field so the slot can be booked again.
   */
  @Prop()
  slotKey?: string;

  @Prop({ required: true, unique: true })
  eventId!: string;

  @Prop({ required: true, enum: Object.values(OutboxStatus), default: OutboxStatus.PENDING })
  outboxStatus!: OutboxStatus;

  @Prop({ required: true, default: 0 })
  publishAttempts!: number;

  @Prop()
  publishingStartedAt?: Date;

  @Prop()
  lastPublishError?: string;

  @Prop()
  createdBy?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export type AppointmentDocument = HydratedDocument<Appointment>;
export const AppointmentSchema = SchemaFactory.createForClass(Appointment);

AppointmentSchema.index({ slotKey: 1 }, { unique: true, sparse: true });
AppointmentSchema.index({ doctorId: 1, status: 1, startTime: 1 });
AppointmentSchema.index({ outboxStatus: 1, publishingStartedAt: 1 });
AppointmentSchema.index({ startTime: -1 });

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ collection: 'notifications', timestamps: true })
export class Notification {
  @Prop({ required: true, unique: true })
  eventId!: string;

  @Prop({ required: true })
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
  message!: string;

  @Prop({ required: true, default: 'APPOINTMENT_CONFIRMATION' })
  type!: string;

  @Prop({ required: true, default: 'RECORDED' })
  status!: string;

  @Prop({ required: true })
  eventVersion!: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export type NotificationDocument = HydratedDocument<Notification>;
export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ createdAt: -1 });
NotificationSchema.index({ appointmentId: 1 });

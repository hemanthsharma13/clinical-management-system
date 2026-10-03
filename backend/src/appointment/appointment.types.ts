import { Field, GraphQLISODateTime, InputType, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';
import { AppointmentStatus, OutboxStatus } from './appointment.schema';
import { SlotState } from './slot';

registerEnumType(AppointmentStatus, { name: 'AppointmentStatus' });
registerEnumType(OutboxStatus, { name: 'OutboxStatus' });
registerEnumType(SlotState, { name: 'SlotState' });

@ObjectType()
export class AppointmentType {
  @Field()
  appointmentId!: string;

  @Field()
  patientId!: string;

  @Field()
  patientName!: string;

  @Field()
  doctorId!: string;

  @Field()
  doctorName!: string;

  @Field()
  specialization!: string;

  @Field(() => GraphQLISODateTime)
  startTime!: Date;

  @Field(() => GraphQLISODateTime)
  endTime!: Date;

  @Field(() => AppointmentStatus)
  status!: AppointmentStatus;

  @Field(() => OutboxStatus)
  outboxStatus!: OutboxStatus;
}

@ObjectType()
export class AppointmentConnection {
  @Field(() => [AppointmentType])
  items!: AppointmentType[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  pageSize!: number;
}

@ObjectType()
export class SlotAvailabilityType {
  @Field({ description: 'Clinic-local wall time, yyyy-MM-ddTHH:mm, with no offset.' })
  startTime!: string;

  @Field(() => SlotState)
  state!: SlotState;
}

@ObjectType()
export class ClinicSettingsType {
  @Field()
  timezone!: string;

  @Field(() => Int)
  slotMinutes!: number;

  @Field()
  opensAt!: string;

  @Field()
  lastSlotAt!: string;
}

@InputType()
export class BookAppointmentInput {
  @Field()
  @IsString()
  @IsNotEmpty({ message: 'Patient is required.' })
  patientId!: string;

  @Field()
  @IsString()
  @IsNotEmpty({ message: 'Doctor is required.' })
  doctorId!: string;

  @Field()
  @IsString()
  @IsNotEmpty({ message: 'Appointment time is required.' })
  startTime!: string;
}

import { Field, GraphQLISODateTime, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class NotificationType {
  @Field()
  eventId!: string;

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
  message!: string;

  @Field()
  type!: string;

  @Field()
  status!: string;

  @Field()
  eventVersion!: string;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;
}

@ObjectType()
export class NotificationConnection {
  @Field(() => [NotificationType])
  items!: NotificationType[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  pageSize!: number;
}

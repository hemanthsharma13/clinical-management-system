import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class DoctorType {
  @Field()
  doctorId!: string;

  @Field()
  name!: string;

  @Field()
  specialization!: string;
}

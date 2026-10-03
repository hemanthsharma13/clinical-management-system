import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';

@ObjectType({ description: 'Administrative patient registration. Not a medical record.' })
export class PatientType {
  @Field()
  patientId!: string;

  @Field()
  firstName!: string;

  @Field()
  lastName!: string;

  @Field()
  name!: string;

  @Field({ description: 'Calendar date YYYY-MM-DD. Not a timestamp.' })
  dateOfBirth!: string;

  @Field()
  email!: string;

  @Field()
  phone!: string;
}

@ObjectType()
export class PatientConnection {
  @Field(() => [PatientType])
  items!: PatientType[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  pageSize!: number;
}

@InputType()
export class RegisterPatientInput {
  @Field()
  @IsString()
  @IsNotEmpty({ message: 'First name is required.' })
  firstName!: string;

  @Field()
  @IsString()
  @IsNotEmpty({ message: 'Last name is required.' })
  lastName!: string;

  @Field()
  @IsString()
  @IsNotEmpty({ message: 'Date of birth is required.' })
  dateOfBirth!: string;

  @Field()
  @IsString()
  @IsNotEmpty({ message: 'Email is required.' })
  email!: string;

  @Field()
  @IsString()
  @IsNotEmpty({ message: 'Phone number is required.' })
  phone!: string;
}

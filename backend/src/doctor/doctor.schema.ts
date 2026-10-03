import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ collection: 'doctors', timestamps: true })
export class Doctor {
  @Prop({ required: true, unique: true })
  doctorId!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  specialization!: string;
}

export type DoctorDocument = HydratedDocument<Doctor>;
export const DoctorSchema = SchemaFactory.createForClass(Doctor);

export const SEEDED_DOCTORS: Array<Pick<Doctor, 'doctorId' | 'name' | 'specialization'>> = [
  { doctorId: 'D201', name: 'Dr. Ananya Rao', specialization: 'General Medicine' },
  { doctorId: 'D202', name: 'Dr. Karthik Menon', specialization: 'Pediatrics' },
  { doctorId: 'D203', name: 'Dr. Leila Rahman', specialization: 'Dermatology' },
  { doctorId: 'D204', name: 'Dr. Joseph Mathew', specialization: 'Orthopedics' },
];

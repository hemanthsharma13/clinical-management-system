import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommonModule } from '../common/common.module';
import { PatientResolver } from './patient.resolver';
import { Patient, PatientSchema } from './patient.schema';
import { PatientService } from './patient.service';

@Module({
  imports: [CommonModule, MongooseModule.forFeature([{ name: Patient.name, schema: PatientSchema }])],
  providers: [PatientService, PatientResolver],
  exports: [PatientService],
})
export class PatientModule {}

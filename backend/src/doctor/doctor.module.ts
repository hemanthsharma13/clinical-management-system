import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DoctorResolver } from './doctor.resolver';
import { Doctor, DoctorSchema } from './doctor.schema';
import { DoctorService } from './doctor.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Doctor.name, schema: DoctorSchema }])],
  providers: [DoctorService, DoctorResolver],
  exports: [DoctorService],
})
export class DoctorModule {}

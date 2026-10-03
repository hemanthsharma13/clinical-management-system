import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommonModule } from '../common/common.module';
import { DoctorModule } from '../doctor/doctor.module';
import { PatientModule } from '../patient/patient.module';
import { AppointmentEventPublisher } from './appointment-event.publisher';
import { AppointmentResolver } from './appointment.resolver';
import { Appointment, AppointmentSchema } from './appointment.schema';
import { AppointmentService } from './appointment.service';
import { OutboxPoller } from './outbox.poller';

@Module({
  imports: [
    CommonModule,
    PatientModule,
    DoctorModule,
    MongooseModule.forFeature([{ name: Appointment.name, schema: AppointmentSchema }]),
  ],
  providers: [AppointmentService, AppointmentResolver, AppointmentEventPublisher, OutboxPoller],
  exports: [AppointmentService],
})
export class AppointmentModule {}

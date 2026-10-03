import { Global, Module } from '@nestjs/common';
import { LocalAppointmentBus } from './local-appointment-bus';

@Global()
@Module({
  providers: [LocalAppointmentBus],
  exports: [LocalAppointmentBus],
})
export class EventsModule {}

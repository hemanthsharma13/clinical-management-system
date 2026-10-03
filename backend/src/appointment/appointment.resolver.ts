import { UseGuards } from '@nestjs/common';
import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { AuthUser, Role } from '../auth/role';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AppointmentService } from './appointment.service';
import {
  AppointmentConnection,
  AppointmentType,
  BookAppointmentInput,
  ClinicSettingsType,
  SlotAvailabilityType,
} from './appointment.types';

@Resolver(() => AppointmentType)
@UseGuards(GqlAuthGuard, RolesGuard)
@Roles(Role.RECEPTIONIST, Role.ADMIN)
export class AppointmentResolver {
  constructor(private readonly appointmentService: AppointmentService) {}

  @Query(() => ClinicSettingsType)
  clinicSettings(): ClinicSettingsType {
    return this.appointmentService.settings();
  }

  @Query(() => [SlotAvailabilityType])
  doctorAvailability(
    @Args('doctorId') doctorId: string,
    @Args('date') date: string,
  ): Promise<SlotAvailabilityType[]> {
    return this.appointmentService.availability(doctorId, date);
  }

  @Query(() => AppointmentConnection)
  appointments(
    @Args('page', { type: () => Int, nullable: true, defaultValue: 1 }) page?: number,
    @Args('pageSize', { type: () => Int, nullable: true, defaultValue: 10 }) pageSize?: number,
  ): Promise<AppointmentConnection> {
    return this.appointmentService.list(page, pageSize);
  }

  @Mutation(() => AppointmentType)
  bookAppointment(
    @Args('input') input: BookAppointmentInput,
    @CurrentUser() user: AuthUser,
  ): Promise<AppointmentType> {
    return this.appointmentService.book(input, user.email);
  }

  @Mutation(() => AppointmentType)
  cancelAppointment(@Args('appointmentId') appointmentId: string): Promise<AppointmentType> {
    return this.appointmentService.cancel(appointmentId);
  }

  @Mutation(() => AppointmentType, {
    description: 'Admin recovery for an appointment whose confirmation event exhausted retries.',
  })
  @Roles(Role.ADMIN)
  retryAppointmentNotification(@Args('appointmentId') appointmentId: string): Promise<AppointmentType> {
    return this.appointmentService.retryNotification(appointmentId);
  }
}

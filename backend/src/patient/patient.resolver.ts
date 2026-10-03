import { UseGuards } from '@nestjs/common';
import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthUser, Role } from '../auth/role';
import { CurrentUser } from '../auth/current-user.decorator';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PatientService } from './patient.service';
import { PatientConnection, PatientType, RegisterPatientInput } from './patient.types';

@Resolver(() => PatientType)
@UseGuards(GqlAuthGuard, RolesGuard)
@Roles(Role.RECEPTIONIST, Role.ADMIN)
export class PatientResolver {
  constructor(private readonly patientService: PatientService) {}

  @Mutation(() => PatientType)
  registerPatient(
    @Args('input') input: RegisterPatientInput,
    @CurrentUser() user: AuthUser,
  ): Promise<PatientType> {
    return this.patientService.register(input, user.email);
  }

  @Query(() => PatientConnection)
  patients(
    @Args('search', { type: () => String, nullable: true }) search?: string,
    @Args('page', { type: () => Int, nullable: true, defaultValue: 1 }) page?: number,
    @Args('pageSize', { type: () => Int, nullable: true, defaultValue: 10 }) pageSize?: number,
  ): Promise<PatientConnection> {
    return this.patientService.search(search, page, pageSize);
  }
}

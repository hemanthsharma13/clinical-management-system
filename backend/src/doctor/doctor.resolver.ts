import { UseGuards } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { Role } from '../auth/role';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { DoctorService } from './doctor.service';
import { DoctorType } from './doctor.types';

@Resolver(() => DoctorType)
@UseGuards(GqlAuthGuard, RolesGuard)
@Roles(Role.RECEPTIONIST, Role.ADMIN)
export class DoctorResolver {
  constructor(private readonly doctorService: DoctorService) {}

  @Query(() => [DoctorType])
  doctors(): Promise<DoctorType[]> {
    return this.doctorService.list();
  }
}

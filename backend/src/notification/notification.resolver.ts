import { UseGuards } from '@nestjs/common';
import { Args, Int, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { Role } from '../auth/role';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { NotificationService } from './notification.service';
import { NotificationConnection, NotificationType } from './notification.types';

@Resolver(() => NotificationType)
@UseGuards(GqlAuthGuard, RolesGuard)
@Roles(Role.RECEPTIONIST, Role.ADMIN)
export class NotificationResolver {
  constructor(private readonly notificationService: NotificationService) {}

  @Query(() => NotificationConnection)
  notifications(
    @Args('page', { type: () => Int, nullable: true, defaultValue: 1 }) page?: number,
    @Args('pageSize', { type: () => Int, nullable: true, defaultValue: 10 }) pageSize?: number,
    @Args('appointmentId', { type: () => String, nullable: true }) appointmentId?: string,
  ): Promise<NotificationConnection> {
    return this.notificationService.list(page, pageSize, appointmentId);
  }
}

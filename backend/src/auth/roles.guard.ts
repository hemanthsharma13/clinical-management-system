import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ROLES_KEY } from './roles.decorator';
import { AuthUser, Role, userHasAllowedRole } from './role';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowed = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!allowed || allowed.length === 0) {
      return true;
    }
    const user = GqlExecutionContext.create(context).getContext<{ req: { user?: AuthUser } }>().req.user;
    if (!user) {
      throw new UnauthorizedException('Authentication is required.');
    }
    if (!userHasAllowedRole(user, allowed)) {
      throw new ForbiddenException('You do not have permission to perform this action.');
    }
    return true;
  }
}

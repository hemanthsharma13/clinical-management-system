import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthUser } from './role';

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): AuthUser => {
  const gql = GqlExecutionContext.create(context);
  return gql.getContext<{ req: { user: AuthUser } }>().req.user;
});

import { UseGuards } from '@nestjs/common';
import { Args, Field, InputType, Mutation, ObjectType, Query, Resolver } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { GqlAuthGuard } from './gql-auth.guard';
import { AuthUser, Role } from './role';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';

@ObjectType()
export class StaffUserType {
  @Field()
  email!: string;

  @Field()
  name!: string;

  @Field()
  role!: string;
}

@ObjectType()
export class AuthPayloadType {
  @Field()
  accessToken!: string;

  @Field(() => StaffUserType)
  user!: StaffUserType;
}

@InputType()
export class LoginInput {
  @Field()
  @IsString()
  @IsNotEmpty({ message: 'Email is required.' })
  email!: string;

  @Field()
  @IsString()
  @IsNotEmpty({ message: 'Password is required.' })
  password!: string;
}

@Resolver()
export class AuthResolver {
  constructor(private readonly auth: AuthService) {}

  @Mutation(() => AuthPayloadType)
  login(@Args('input') input: LoginInput): Promise<AuthPayloadType> {
    return this.auth.login(input.email, input.password);
  }

  @Query(() => StaffUserType)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(Role.RECEPTIONIST, Role.ADMIN)
  me(@CurrentUser() user: AuthUser): StaffUserType {
    return { email: user.email, name: user.name, role: user.role };
  }

  @Query(() => [StaffUserType], {
    description: 'Staff accounts. Admin only, so a receptionist token is rejected by the API.',
  })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  staffUsers(): Promise<StaffUserType[]> {
    return this.auth.listStaff();
  }
}

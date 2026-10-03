import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { Role, userHasAllowedRole } from './role';

describe('authentication and authorization', () => {
  it('gives admin access to every current role list and refuses a receptionist for admin-only', () => {
    expect(userHasAllowedRole({ role: Role.ADMIN }, [Role.RECEPTIONIST, Role.ADMIN])).toBe(true);
    expect(userHasAllowedRole({ role: Role.RECEPTIONIST }, [Role.RECEPTIONIST, Role.ADMIN])).toBe(true);
    expect(userHasAllowedRole({ role: Role.RECEPTIONIST }, [Role.ADMIN])).toBe(false);
    expect(userHasAllowedRole(undefined, [Role.ADMIN])).toBe(false);
  });

  it('returns a token for a matching password and the same error for a bad password', async () => {
    const passwordHash = await bcrypt.hash('receptionist123', 4);
    const users = {
      findOne: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'receptionist@harbor-clinic.test',
        role: Role.RECEPTIONIST,
        name: 'Maya Iyer',
        passwordHash,
      }),
    };
    const jwt = { signAsync: jest.fn().mockResolvedValue('signed-token') };
    const service = new AuthService(users as never, jwt as unknown as JwtService);

    const result = await service.login(' Receptionist@Harbor-Clinic.TEST ', 'receptionist123');
    expect(result.accessToken).toBe('signed-token');
    expect(result.user.role).toBe(Role.RECEPTIONIST);
    await expect(service.login('receptionist@harbor-clinic.test', 'wrong-password')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('uses the database role rather than a stale role inside the token', async () => {
    const users = {
      findOne: jest.fn().mockResolvedValue({
        id: 'user-2',
        email: 'admin@harbor-clinic.test',
        role: Role.RECEPTIONIST,
        name: 'Arun Deshpande',
      }),
    };
    const strategy = new JwtStrategy({ getOrThrow: () => 'test-secret' } as never, users as never);
    const authUser = await strategy.validate({ sub: 'user-2', email: 'admin@harbor-clinic.test' });
    expect(authUser.role).toBe(Role.RECEPTIONIST);
  });
});

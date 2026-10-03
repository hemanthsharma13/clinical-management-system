import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import bcrypt from 'bcryptjs';
import { Model } from 'mongoose';
import { AuthUser } from './role';
import { User } from './user.schema';

export interface LoginResult {
  accessToken: string;
  user: AuthUser;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly users: Model<User>,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string): Promise<LoginResult> {
    const normalized = email.trim().toLowerCase();
    const user = await this.users.findOne({ email: normalized });
    const matches = user ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!user || !matches) {
      throw new UnauthorizedException('Invalid email or password.');
    }
    const authUser: AuthUser = {
      userId: String(user.id),
      email: user.email,
      role: user.role,
      name: user.name,
    };
    const accessToken = await this.jwt.signAsync({
      sub: authUser.userId,
      email: authUser.email,
      role: authUser.role,
    });
    return { accessToken, user: authUser };
  }

  async listStaff(): Promise<Array<Pick<AuthUser, 'email' | 'role' | 'name'>>> {
    const users = await this.users.find().select('email role name').sort({ email: 1 }).lean();
    return users.map((user) => ({
      email: user.email,
      role: user.role,
      name: user.name,
    }));
  }
}

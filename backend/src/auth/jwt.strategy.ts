import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { PassportStrategy } from '@nestjs/passport';
import { Model } from 'mongoose';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthUser } from './role';
import { User } from './user.schema';

interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectModel(User.name) private readonly users: Model<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('jwtSecret'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    const email = payload?.email?.toLowerCase();
    if (!email) {
      throw new UnauthorizedException('Authentication is required.');
    }
    const user = await this.users.findOne({ email });
    if (!user) {
      throw new UnauthorizedException('Authentication is required.');
    }
    return {
      userId: String(user.id),
      email: user.email,
      role: user.role,
      name: user.name,
    };
  }
}

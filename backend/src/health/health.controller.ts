import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Controller('health')
export class HealthController {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly config: ConfigService,
  ) {}

  @Get()
  health(): { status: string; mongo: string; kafka: string } {
    const mongo = this.connection.readyState === 1 ? 'up' : 'down';
    return {
      status: mongo === 'up' ? 'ok' : 'degraded',
      mongo,
      kafka: this.config.get<boolean>('kafka.enabled') ? 'configured' : 'disabled',
    };
  }

  @Get('live')
  live(): { status: string } {
    return { status: 'ok' };
  }

  @Get('ready')
  ready(): { status: string } {
    if (this.connection.readyState !== 1) {
      throw new ServiceUnavailableException('MongoDB is not ready.');
    }
    return { status: 'ok' };
  }
}

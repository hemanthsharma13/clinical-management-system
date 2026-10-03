import 'reflect-metadata';
import { BadRequestException, ValidationError, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

function validationMessages(errors: ValidationError[]): string[] {
  const messages: string[] = [];
  for (const error of errors) {
    if (error.constraints) {
      messages.push(...Object.values(error.constraints));
    }
    if (error.children?.length) {
      messages.push(...validationMessages(error.children));
    }
  }
  return messages;
}

function assertProductionSecret(): void {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }
  const secret = process.env.JWT_SECRET ?? '';
  if (secret.length < 32 || secret.includes('change-me') || secret.includes('dev-only')) {
    throw new Error('JWT_SECRET must be a real secret of at least 32 characters in production.');
  }
}

async function bootstrap(): Promise<void> {
  assertProductionSecret();
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  app.enableCors({
    origin: config.get<string[]>('corsOrigin') ?? ['http://localhost:5173'],
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => new BadRequestException(validationMessages(errors).join(' ')),
    }),
  );
  const port = config.get<number>('port') ?? 3000;
  await app.listen(port);
}

void bootstrap();

import { join } from 'path';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { MongooseModule } from '@nestjs/mongoose';
import { AppointmentModule } from './appointment/appointment.module';
import { AuthModule } from './auth/auth.module';
import configuration from './config/configuration';
import { formatGraphqlError } from './graphql/format-error';
import { DoctorModule } from './doctor/doctor.module';
import { EventsModule } from './events/events.module';
import { HealthModule } from './health/health.module';
import { KafkaModule } from './kafka/kafka.module';
import { NotificationModule } from './notification/notification.module';
import { PatientModule } from './patient/patient.module';
import { resolveMongoUri } from './persistence/mongo-uri';
import { SeedModule } from './seed/seed.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: [join(process.cwd(), '.env'), join(process.cwd(), '../.env')],
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        uri: await resolveMongoUri(config.getOrThrow<string>('mongoUri')),
        autoIndex: true,
        serverSelectionTimeoutMS: 10_000,
      }),
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      sortSchema: true,
      playground: process.env.NODE_ENV !== 'production',
      introspection: process.env.NODE_ENV !== 'production',
      context: ({ req }: { req: unknown }) => ({ req }),
      formatError: formatGraphqlError,
    }),
    KafkaModule,
    EventsModule,
    AuthModule,
    PatientModule,
    DoctorModule,
    AppointmentModule,
    NotificationModule,
    SeedModule,
    HealthModule,
  ],
})
export class AppModule {}

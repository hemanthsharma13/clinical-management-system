function flag(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value === '') {
    return defaultValue;
  }
  return value === 'true' || value === '1';
}

export interface AppConfig {
  port: number;
  nodeEnv: string;
  mongoUri: string;
  jwtSecret: string;
  jwtExpiresSeconds: number;
  clinicTimezone: string;
  outboxPollMs: number;
  processRole: 'all' | 'api' | 'worker';
  corsOrigin: string[];
  seed: {
    receptionistPassword: string;
    adminPassword: string;
  };
  kafka: {
    enabled: boolean;
    brokers: string[];
    clientId: string;
    topic: string;
    groupId: string;
    idempotent: boolean;
  };
}

export default function configuration(): AppConfig {
  const role = process.env.PROCESS_ROLE ?? 'all';
  const processRole = role === 'api' || role === 'worker' || role === 'all' ? role : 'all';

  return {
    port: parseInt(process.env.PORT ?? '3000', 10),
    nodeEnv: process.env.NODE_ENV ?? 'development',
    mongoUri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/clinic',
    jwtSecret: process.env.JWT_SECRET ?? 'dev-only-change-me',
    jwtExpiresSeconds: parseInt(process.env.JWT_EXPIRES_SECONDS ?? '28800', 10),
    clinicTimezone: process.env.CLINIC_TIMEZONE ?? 'Asia/Kolkata',
    outboxPollMs: parseInt(process.env.OUTBOX_POLL_MS ?? '5000', 10),
    processRole,
    corsOrigin: (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(',').map((item) => item.trim()),
    seed: {
      receptionistPassword: process.env.RECEPTIONIST_PASSWORD ?? 'receptionist123',
      adminPassword: process.env.ADMIN_PASSWORD ?? 'admin123',
    },
    kafka: {
      enabled: flag(process.env.KAFKA_ENABLED, true),
      brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(',').map((item) => item.trim()),
      clientId: process.env.KAFKA_CLIENT_ID ?? 'clinic-appointment-system',
      topic: process.env.KAFKA_APPOINTMENT_TOPIC ?? 'appointment.booked',
      groupId: process.env.KAFKA_NOTIFICATION_GROUP ?? 'notification-service',
      idempotent: flag(process.env.KAFKA_IDEMPOTENT, true),
    },
  };
}

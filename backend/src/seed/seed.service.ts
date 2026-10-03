import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import bcrypt from 'bcryptjs';
import { Model } from 'mongoose';
import { Role } from '../auth/role';
import { User } from '../auth/user.schema';
import { Doctor, SEEDED_DOCTORS } from '../doctor/doctor.schema';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectModel(User.name) private readonly users: Model<User>,
    @InjectModel(Doctor.name) private readonly doctors: Model<Doctor>,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedUsers();
    await this.seedDoctors();
  }

  private async seedUsers(): Promise<void> {
    const accounts = [
      {
        email: 'receptionist@harbor-clinic.test',
        name: 'Maya Iyer',
        role: Role.RECEPTIONIST,
        password: this.config.get<string>('seed.receptionistPassword') ?? 'receptionist123',
      },
      {
        email: 'admin@harbor-clinic.test',
        name: 'Arun Deshpande',
        role: Role.ADMIN,
        password: this.config.get<string>('seed.adminPassword') ?? 'admin123',
      },
    ];

    for (const account of accounts) {
      const existing = await this.users.findOne({ email: account.email });
      if (existing) {
        continue;
      }
      await this.users.create({
        email: account.email,
        name: account.name,
        role: account.role,
        passwordHash: await bcrypt.hash(account.password, 10),
      });
      this.logger.log(`Seeded ${account.role} account ${account.email}`);
    }
  }

  private async seedDoctors(): Promise<void> {
    for (const doctor of SEEDED_DOCTORS) {
      await this.doctors.updateOne({ doctorId: doctor.doctorId }, { $set: doctor }, { upsert: true });
    }
  }
}

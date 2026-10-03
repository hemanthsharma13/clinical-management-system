import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../auth/user.schema';
import { Doctor, DoctorSchema } from '../doctor/doctor.schema';
import { SeedService } from './seed.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Doctor.name, schema: DoctorSchema },
    ]),
  ],
  providers: [SeedService],
})
export class SeedModule {}

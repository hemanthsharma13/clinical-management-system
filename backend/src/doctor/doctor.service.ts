import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Doctor } from './doctor.schema';
import { DoctorType } from './doctor.types';

@Injectable()
export class DoctorService {
  constructor(@InjectModel(Doctor.name) private readonly doctors: Model<Doctor>) {}

  async list(): Promise<DoctorType[]> {
    const doctors = await this.doctors.find().sort({ doctorId: 1 }).lean();
    return doctors.map((doctor) => this.toType(doctor));
  }

  async findByDoctorId(doctorId: string): Promise<DoctorType | null> {
    const doctor = await this.doctors.findOne({ doctorId }).lean();
    return doctor ? this.toType(doctor) : null;
  }

  private toType(doctor: { doctorId: string; name: string; specialization: string }): DoctorType {
    return {
      doctorId: doctor.doctorId,
      name: doctor.name,
      specialization: doctor.specialization,
    };
  }
}

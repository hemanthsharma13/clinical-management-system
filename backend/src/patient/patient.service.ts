import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { isDuplicateKeyError } from '../common/duplicate-key';
import { formatPatientId } from '../common/ids';
import {
  assertDateOfBirth,
  assertEmail,
  assertPersonName,
  assertPhone,
  clampPage,
  clinicTodayIso,
  FieldValidationError,
  patientSearchFilter,
} from '../common/validation';
import { CounterService } from '../common/counter.service';
import { Patient } from './patient.schema';
import { PatientConnection, PatientType, RegisterPatientInput } from './patient.types';

@Injectable()
export class PatientService {
  constructor(
    @InjectModel(Patient.name) private readonly patients: Model<Patient>,
    private readonly counters: CounterService,
    private readonly config: ConfigService,
  ) {}

  async register(input: RegisterPatientInput, createdBy?: string): Promise<PatientType> {
    const record = this.normalize(input);
    const patientId = formatPatientId(await this.counters.next('patient'));
    try {
      const created = await this.patients.create({
        patientId,
        ...record,
        createdBy,
      });
      return this.toType(created);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException('A patient with this email is already registered.');
      }
      throw error;
    }
  }

  async search(search: string | undefined, page: number | undefined, pageSize: number | undefined): Promise<PatientConnection> {
    let paging: { page: number; pageSize: number };
    try {
      if (search && search.trim().length > 80) {
        throw new FieldValidationError('Search text must be 80 characters or fewer.');
      }
      paging = clampPage(page, pageSize);
    } catch (error) {
      if (error instanceof FieldValidationError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }

    const filter = patientSearchFilter(search);
    const [items, total] = await Promise.all([
      this.patients
        .find(filter)
        .sort({ lastName: 1, firstName: 1, patientId: 1 })
        .skip((paging.page - 1) * paging.pageSize)
        .limit(paging.pageSize)
        .lean(),
      this.patients.countDocuments(filter),
    ]);

    return {
      items: items.map((item) => this.toType(item)),
      total,
      page: paging.page,
      pageSize: paging.pageSize,
    };
  }

  async findByPatientId(patientId: string): Promise<PatientType | null> {
    const patient = await this.patients.findOne({ patientId }).lean();
    return patient ? this.toType(patient) : null;
  }

  private normalize(input: RegisterPatientInput): Omit<PatientType, 'patientId' | 'name'> {
    try {
      const timeZone = this.config.get<string>('clinicTimezone') ?? 'Asia/Kolkata';
      return {
        firstName: assertPersonName(input.firstName, 'First name'),
        lastName: assertPersonName(input.lastName, 'Last name'),
        dateOfBirth: assertDateOfBirth(input.dateOfBirth.trim(), clinicTodayIso(timeZone)),
        email: assertEmail(input.email),
        phone: assertPhone(input.phone),
      };
    } catch (error) {
      if (error instanceof FieldValidationError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  private toType(patient: {
    patientId: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    email: string;
    phone: string;
  }): PatientType {
    return {
      patientId: patient.patientId,
      firstName: patient.firstName,
      lastName: patient.lastName,
      name: `${patient.firstName} ${patient.lastName}`,
      dateOfBirth: patient.dateOfBirth,
      email: patient.email,
      phone: patient.phone,
    };
  }
}

import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { DateTime } from 'luxon';
import { Model } from 'mongoose';
import { CounterService } from '../common/counter.service';
import { isDuplicateKeyError } from '../common/duplicate-key';
import { formatAppointmentId } from '../common/ids';
import { FieldValidationError, clampPage } from '../common/validation';
import { DoctorService } from '../doctor/doctor.service';
import { PatientService } from '../patient/patient.service';
import { AppointmentEventPublisher } from './appointment-event.publisher';
import { Appointment, AppointmentStatus, OutboxStatus } from './appointment.schema';
import { AppointmentConnection, AppointmentType, BookAppointmentInput, SlotAvailabilityType } from './appointment.types';
import { buildDaySlots, classifySlot, parseClinicSlot, slotKeyFor, SlotValidationError } from './slot';

@Injectable()
export class AppointmentService implements OnModuleInit {
  private readonly logger = new Logger(AppointmentService.name);

  constructor(
    @InjectModel(Appointment.name) private readonly appointments: Model<Appointment>,
    private readonly patients: PatientService,
    private readonly doctors: DoctorService,
    private readonly counters: CounterService,
    private readonly publisher: AppointmentEventPublisher,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.appointments.syncIndexes();
    const indexes = await this.appointments.collection.indexes();
    const slotIndex = indexes.find((index) => index.key?.slotKey === 1 && index.unique && index.sparse);
    if (!slotIndex) {
      this.logger.error('Missing unique sparse slotKey index. Double-booking protection is not active.');
    }
  }

  async book(input: BookAppointmentInput, createdBy?: string): Promise<AppointmentType> {
    const timeZone = this.timeZone();
    let slot;
    try {
      slot = parseClinicSlot(input.startTime, timeZone);
    } catch (error) {
      if (error instanceof SlotValidationError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }

    const patient = await this.patients.findByPatientId(input.patientId.trim());
    if (!patient) {
      throw new NotFoundException(`Patient ${input.patientId} was not found.`);
    }
    const doctor = await this.doctors.findByDoctorId(input.doctorId.trim());
    if (!doctor) {
      throw new NotFoundException(`Doctor ${input.doctorId} was not found.`);
    }

    const overlap = await this.appointments.findOne({
      doctorId: doctor.doctorId,
      status: AppointmentStatus.BOOKED,
      startTime: { $lt: slot.end },
      endTime: { $gt: slot.start },
    });
    if (overlap) {
      throw new ConflictException(`${doctor.name} already has an appointment at this time.`);
    }

    const appointmentId = formatAppointmentId(await this.counters.next('appointment'));
    try {
      const created = await this.appointments.create({
        appointmentId,
        patientId: patient.patientId,
        patientName: patient.name,
        doctorId: doctor.doctorId,
        doctorName: doctor.name,
        specialization: doctor.specialization,
        startTime: slot.start,
        endTime: slot.end,
        status: AppointmentStatus.BOOKED,
        slotKey: slotKeyFor(doctor.doctorId, slot.start),
        eventId: randomUUID(),
        outboxStatus: OutboxStatus.PENDING,
        publishAttempts: 0,
        createdBy,
      });
      await this.publisher.publishById(created.appointmentId);
      const fresh = await this.appointments.findOne({ appointmentId: created.appointmentId }).lean();
      return this.toType(fresh ?? created);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException(`${doctor.name} already has an appointment at this time.`);
      }
      throw error;
    }
  }

  async cancel(appointmentId: string): Promise<AppointmentType> {
    const existing = await this.appointments.findOne({ appointmentId }).lean();
    if (!existing) {
      throw new NotFoundException(`Appointment ${appointmentId} was not found.`);
    }
    if (existing.status === AppointmentStatus.CANCELLED) {
      return this.toType(existing);
    }

    const updated = await this.appointments.findOneAndUpdate(
      { appointmentId, status: AppointmentStatus.BOOKED },
      { $set: { status: AppointmentStatus.CANCELLED }, $unset: { slotKey: 1 } },
      { new: true },
    );
    if (!updated) {
      const again = await this.appointments.findOne({ appointmentId }).lean();
      if (again?.status === AppointmentStatus.CANCELLED) {
        return this.toType(again);
      }
      throw new NotFoundException(`Appointment ${appointmentId} was not found.`);
    }
    return this.toType(updated);
  }

  async list(pageInput?: number, pageSizeInput?: number): Promise<AppointmentConnection> {
    const paging = this.paging(pageInput, pageSizeInput);
    const [items, total] = await Promise.all([
      this.appointments
        .find()
        .sort({ startTime: -1, appointmentId: 1 })
        .skip((paging.page - 1) * paging.pageSize)
        .limit(paging.pageSize)
        .lean(),
      this.appointments.countDocuments(),
    ]);
    return {
      items: items.map((item) => this.toType(item)),
      total,
      page: paging.page,
      pageSize: paging.pageSize,
    };
  }

  async availability(doctorId: string, date: string): Promise<SlotAvailabilityType[]> {
    const doctor = await this.doctors.findByDoctorId(doctorId.trim());
    if (!doctor) {
      throw new NotFoundException(`Doctor ${doctorId} was not found.`);
    }
    let slots;
    try {
      slots = buildDaySlots(date, this.timeZone());
    } catch (error) {
      if (error instanceof SlotValidationError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }

    const booked = await this.appointments
      .find({
        doctorId: doctor.doctorId,
        status: AppointmentStatus.BOOKED,
        startTime: { $gte: slots[0].start, $lt: slots[slots.length - 1].end },
      })
      .select('startTime')
      .lean();
    const taken = new Set(booked.map((item) => new Date(item.startTime).toISOString()));
    const now = DateTime.now();
    return slots.map((slot) => ({
      startTime: slot.localIso,
      state: classifySlot(slot.start, taken.has(slot.start.toISOString()), this.timeZone(), now),
    }));
  }

  async retryNotification(appointmentId: string): Promise<AppointmentType> {
    const existing = await this.appointments.findOne({ appointmentId }).lean();
    if (!existing) {
      throw new NotFoundException(`Appointment ${appointmentId} was not found.`);
    }
    if (existing.status !== AppointmentStatus.BOOKED) {
      throw new BadRequestException('Only booked appointments can republish a confirmation.');
    }
    if (existing.outboxStatus === OutboxStatus.FAILED) {
      await this.publisher.resetForRetry(appointmentId);
    }
    await this.publisher.publishById(appointmentId);
    const fresh = await this.appointments.findOne({ appointmentId }).lean();
    if (!fresh) {
      throw new NotFoundException(`Appointment ${appointmentId} was not found.`);
    }
    return this.toType(fresh);
  }

  settings(): { timezone: string; slotMinutes: number; opensAt: string; lastSlotAt: string } {
    return {
      timezone: this.timeZone(),
      slotMinutes: 30,
      opensAt: '09:00',
      lastSlotAt: '16:30',
    };
  }

  private paging(page?: number, pageSize?: number): { page: number; pageSize: number } {
    try {
      return clampPage(page, pageSize);
    } catch (error) {
      if (error instanceof FieldValidationError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  private timeZone(): string {
    return this.config.get<string>('clinicTimezone') ?? 'Asia/Kolkata';
  }

  private toType(appointment: {
    appointmentId: string;
    patientId: string;
    patientName: string;
    doctorId: string;
    doctorName: string;
    specialization: string;
    startTime: Date;
    endTime: Date;
    status: AppointmentStatus;
    outboxStatus: OutboxStatus;
  }): AppointmentType {
    return {
      appointmentId: appointment.appointmentId,
      patientId: appointment.patientId,
      patientName: appointment.patientName,
      doctorId: appointment.doctorId,
      doctorName: appointment.doctorName,
      specialization: appointment.specialization,
      startTime: new Date(appointment.startTime),
      endTime: new Date(appointment.endTime),
      status: appointment.status,
      outboxStatus: appointment.outboxStatus,
    };
  }
}

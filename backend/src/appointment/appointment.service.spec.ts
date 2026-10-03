import { ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DateTime } from 'luxon';
import { CounterService } from '../common/counter.service';
import { DoctorService } from '../doctor/doctor.service';
import { PatientService } from '../patient/patient.service';
import { AppointmentEventPublisher } from './appointment-event.publisher';
import { AppointmentService } from './appointment.service';
import { AppointmentStatus, OutboxStatus } from './appointment.schema';

describe('AppointmentService', () => {
  const appointments = {
    create: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findOneAndUpdate: jest.fn(),
    countDocuments: jest.fn(),
    syncIndexes: jest.fn(),
    collection: { indexes: jest.fn().mockResolvedValue([{ key: { slotKey: 1 }, unique: true, sparse: true }]) },
  };
  const patients = { findByPatientId: jest.fn() };
  const doctors = { findByDoctorId: jest.fn() };
  const counters = { next: jest.fn() };
  const publisher = { publishById: jest.fn(), resetForRetry: jest.fn() };
  const config = { get: jest.fn().mockReturnValue('Asia/Kolkata') };

  const service = new AppointmentService(
    appointments as never,
    patients as unknown as PatientService,
    doctors as unknown as DoctorService,
    counters as unknown as CounterService,
    publisher as unknown as AppointmentEventPublisher,
    config as unknown as ConfigService,
  );

  const patient = {
    patientId: 'P101',
    name: 'Asha Verma',
    firstName: 'Asha',
    lastName: 'Verma',
    dateOfBirth: '1992-04-12',
    email: 'asha@example.test',
    phone: '9876543210',
  };
  const doctor = { doctorId: 'D201', name: 'Dr. Ananya Rao', specialization: 'General Medicine' };

  beforeEach(() => {
    jest.clearAllMocks();
    config.get.mockReturnValue('Asia/Kolkata');
    patients.findByPatientId.mockResolvedValue(patient);
    doctors.findByDoctorId.mockResolvedValue(doctor);
    counters.next.mockResolvedValue(1);
    appointments.findOne.mockResolvedValue(null);
    publisher.publishById.mockResolvedValue(undefined);
  });

  it('books a future aligned slot and asks the publisher to emit the event', async () => {
    const future = DateTime.now().setZone('Asia/Kolkata').plus({ days: 2 }).set({ hour: 10, minute: 0, second: 0, millisecond: 0 });
    const saved = {
      appointmentId: 'A1001',
      patientId: 'P101',
      patientName: 'Asha Verma',
      doctorId: 'D201',
      doctorName: 'Dr. Ananya Rao',
      specialization: 'General Medicine',
      startTime: future.toUTC().toJSDate(),
      endTime: future.plus({ minutes: 30 }).toUTC().toJSDate(),
      status: AppointmentStatus.BOOKED,
      outboxStatus: OutboxStatus.PENDING,
    };
    appointments.create.mockResolvedValue(saved);
    appointments.findOne.mockResolvedValueOnce(null).mockReturnValue({ lean: jest.fn().mockResolvedValue(saved) });

    const booked = await service.book({
      patientId: 'P101',
      doctorId: 'D201',
      startTime: future.toFormat("yyyy-MM-dd'T'HH:mm"),
    });

    expect(booked.appointmentId).toBe('A1001');
    expect(booked.status).toBe(AppointmentStatus.BOOKED);
    expect(appointments.create).toHaveBeenCalledWith(
      expect.objectContaining({
        slotKey: `D201|${future.toUTC().toJSDate().toISOString()}`,
        outboxStatus: OutboxStatus.PENDING,
      }),
    );
    expect(publisher.publishById).toHaveBeenCalledWith('A1001');
  });

  it('rejects an overlapping slot found before insert', async () => {
    const future = DateTime.now().setZone('Asia/Kolkata').plus({ days: 2 }).set({ hour: 11, minute: 30, second: 0, millisecond: 0 });
    appointments.findOne.mockResolvedValue({ appointmentId: 'A1000' });

    await expect(
      service.book({ patientId: 'P101', doctorId: 'D201', startTime: future.toFormat("yyyy-MM-dd'T'HH:mm") }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(appointments.create).not.toHaveBeenCalled();
  });

  it('maps a unique-index race to the same conflict', async () => {
    const future = DateTime.now().setZone('Asia/Kolkata').plus({ days: 2 }).set({ hour: 12, minute: 0, second: 0, millisecond: 0 });
    appointments.findOne.mockResolvedValue(null);
    appointments.create.mockRejectedValue({ code: 11000 });

    await expect(
      service.book({ patientId: 'P101', doctorId: 'D201', startTime: future.toFormat("yyyy-MM-dd'T'HH:mm") }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('frees the slot key when a booked appointment is cancelled', async () => {
    const existing = {
      appointmentId: 'A1001',
      patientId: 'P101',
      patientName: 'Asha Verma',
      doctorId: 'D201',
      doctorName: 'Dr. Ananya Rao',
      specialization: 'General Medicine',
      startTime: new Date(),
      endTime: new Date(),
      status: AppointmentStatus.BOOKED,
      outboxStatus: OutboxStatus.PUBLISHED,
    };
    appointments.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(existing) });
    appointments.findOneAndUpdate.mockResolvedValue({
      ...existing,
      status: AppointmentStatus.CANCELLED,
      slotKey: undefined,
    });

    const cancelled = await service.cancel('A1001');
    expect(cancelled.status).toBe(AppointmentStatus.CANCELLED);
    expect(appointments.findOneAndUpdate).toHaveBeenCalledWith(
      { appointmentId: 'A1001', status: AppointmentStatus.BOOKED },
      { $set: { status: AppointmentStatus.CANCELLED }, $unset: { slotKey: 1 } },
      { new: true },
    );
  });

  it('returns not found for an unknown patient', async () => {
    patients.findByPatientId.mockResolvedValue(null);
    const future = DateTime.now().setZone('Asia/Kolkata').plus({ days: 1 }).set({ hour: 9, minute: 0, second: 0, millisecond: 0 });
    await expect(
      service.book({ patientId: 'P999', doctorId: 'D201', startTime: future.toFormat("yyyy-MM-dd'T'HH:mm") }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

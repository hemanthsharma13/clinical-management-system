import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CounterService } from '../common/counter.service';
import { PatientService } from './patient.service';
import { RegisterPatientInput } from './patient.types';

function chain(result: unknown) {
  return {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
  };
}

describe('PatientService', () => {
  const patients = {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    countDocuments: jest.fn(),
  };
  const counters = { next: jest.fn() };
  const config = { get: jest.fn().mockReturnValue('Asia/Kolkata') };
  const service = new PatientService(
    patients as never,
    counters as unknown as CounterService,
    config as unknown as ConfigService,
  );

  const input: RegisterPatientInput = {
    firstName: 'Asha',
    lastName: 'Verma',
    dateOfBirth: '1992-04-12',
    email: 'Asha@Example.test',
    phone: '9876543210',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    config.get.mockReturnValue('Asia/Kolkata');
  });

  it('stores a normalized patient and returns a system id', async () => {
    counters.next.mockResolvedValue(1);
    patients.create.mockImplementation(async (doc) => doc);

    const created = await service.register(input, 'receptionist@harbor-clinic.test');

    expect(created.patientId).toBe('P101');
    expect(created.name).toBe('Asha Verma');
    expect(created.email).toBe('asha@example.test');
    expect(patients.create).toHaveBeenCalledWith(expect.objectContaining({ createdBy: 'receptionist@harbor-clinic.test' }));
  });

  it('turns a duplicate email into a conflict', async () => {
    counters.next.mockResolvedValue(2);
    patients.create.mockRejectedValue({ code: 11000 });
    await expect(service.register(input)).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects a future date of birth before touching the database', async () => {
    await expect(service.register({ ...input, dateOfBirth: '2999-01-01' })).rejects.toThrow(/future/);
    expect(patients.create).not.toHaveBeenCalled();
  });

  it('searches with an escaped name and returns a page', async () => {
    patients.find.mockReturnValue(
      chain([
        {
          patientId: 'P101',
          firstName: 'Asha',
          lastName: 'Verma',
          dateOfBirth: '1992-04-12',
          email: 'asha@example.test',
          phone: '9876543210',
        },
      ]),
    );
    patients.countDocuments.mockResolvedValue(1);

    const page = await service.search('Asha', 1, 10);
    expect(page.total).toBe(1);
    expect(page.items[0].name).toBe('Asha Verma');
    expect(patients.find).toHaveBeenCalledWith(
      expect.objectContaining({
        $or: expect.arrayContaining([expect.objectContaining({ firstName: expect.any(RegExp) })]),
      }),
    );
  });
});

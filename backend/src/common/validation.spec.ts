import {
  assertDateOfBirth,
  assertEmail,
  assertPersonName,
  assertPhone,
  clampPage,
  FieldValidationError,
  patientSearchFilter,
} from './validation';
import { formatAppointmentId, formatPatientId } from './ids';

describe('field validation', () => {
  it('trims names and rejects blanks or oversized values', () => {
    expect(assertPersonName('  Asha  ', 'First name')).toBe('Asha');
    expect(() => assertPersonName('   ', 'First name')).toThrow(FieldValidationError);
    expect(() => assertPersonName('a'.repeat(81), 'First name')).toThrow(/80/);
  });

  it('normalizes email and rejects a missing domain', () => {
    expect(assertEmail(' Maya@Harbor-Clinic.TEST ')).toBe('maya@harbor-clinic.test');
    expect(() => assertEmail('maya@localhost')).toThrow(/valid email/);
  });

  it('counts phone digits and rejects letters', () => {
    expect(assertPhone('+91 98765 43210')).toBe('+91 98765 43210');
    expect(() => assertPhone('12345')).toThrow(/7 and 15/);
    expect(() => assertPhone('98abc76543')).toThrow(/invalid characters/);
  });

  it('accepts a real past date of birth and rejects impossible or future dates', () => {
    expect(assertDateOfBirth('1990-02-28', '2026-10-02')).toBe('1990-02-28');
    expect(() => assertDateOfBirth('1990-02-31', '2026-10-02')).toThrow(/real calendar/);
    expect(() => assertDateOfBirth('2026-10-03', '2026-10-02')).toThrow(/future/);
    expect(() => assertDateOfBirth('1899-12-31', '2026-10-02')).toThrow(/1900/);
  });

  it('clamps pagination into the supported window', () => {
    expect(clampPage(undefined, undefined)).toEqual({ page: 1, pageSize: 10 });
    expect(() => clampPage(0, 10)).toThrow(/Page must be 1/);
    expect(() => clampPage(1, 51)).toThrow(/Page size/);
  });

  it('escapes regex search text so a dot does not match every name', () => {
    const filter = patientSearchFilter('.*');
    const pattern = filter.$or?.[0].firstName as RegExp;
    expect(pattern.test('abc')).toBe(false);
    expect(pattern.test('.*')).toBe(true);
    expect(patientSearchFilter('  ')).toEqual({});
    expect(patientSearchFilter('Asha Verma')?.$or).toHaveLength(4);
  });

  it('formats the first ids to match the sample identifiers', () => {
    expect(formatPatientId(1)).toBe('P101');
    expect(formatAppointmentId(1)).toBe('A1001');
    expect(formatPatientId(900)).toBe('P1000');
  });
});

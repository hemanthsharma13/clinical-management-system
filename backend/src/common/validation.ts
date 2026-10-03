import { DateTime } from 'luxon';

export class FieldValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FieldValidationError';
  }
}

export function assertPersonName(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new FieldValidationError(`${label} is required.`);
  }
  if (trimmed.length > 80) {
    throw new FieldValidationError(`${label} must be 80 characters or fewer.`);
  }
  return trimmed;
}

export function assertEmail(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new FieldValidationError('Enter a valid email address.');
  }
  if (trimmed.length > 254) {
    throw new FieldValidationError('Email must be 254 characters or fewer.');
  }
  return trimmed;
}

export function assertPhone(value: string): string {
  const trimmed = value.trim();
  if (!/^[0-9+()\-\s]+$/.test(trimmed)) {
    throw new FieldValidationError('Phone number contains invalid characters.');
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) {
    throw new FieldValidationError('Phone number must contain between 7 and 15 digits.');
  }
  return trimmed;
}

export function assertDateOfBirth(value: string, todayIso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new FieldValidationError('Date of birth must be YYYY-MM-DD.');
  }
  const dob = DateTime.fromISO(value, { zone: 'utc' });
  if (!dob.isValid || dob.toISODate() !== value) {
    throw new FieldValidationError('Date of birth is not a real calendar date.');
  }
  if (value < '1900-01-01') {
    throw new FieldValidationError('Date of birth must be on or after 1900-01-01.');
  }
  if (value > todayIso) {
    throw new FieldValidationError('Date of birth cannot be in the future.');
  }
  return value;
}

export function clinicTodayIso(timeZone: string, now: Date = new Date()): string {
  const iso = DateTime.fromJSDate(now).setZone(timeZone).toISODate();
  if (!iso) {
    throw new FieldValidationError('Clinic timezone is not valid.');
  }
  return iso;
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface PatientSearchFilter {
  $or?: Array<Record<string, RegExp>>;
}

export function patientSearchFilter(search?: string): PatientSearchFilter {
  const term = search?.trim();
  if (!term) {
    return {};
  }
  const clauses: Array<Record<string, RegExp>> = [
    { firstName: new RegExp(escapeRegex(term), 'i') },
    { lastName: new RegExp(escapeRegex(term), 'i') },
    { patientId: new RegExp(escapeRegex(term), 'i') },
  ];
  const parts = term.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const first = new RegExp(`^${escapeRegex(parts[0])}`, 'i');
    const last = new RegExp(`^${escapeRegex(parts.slice(1).join(' '))}`, 'i');
    clauses.push({ firstName: first, lastName: last });
  }
  return { $or: clauses };
}

export function clampPage(page?: number, pageSize?: number): { page: number; pageSize: number } {
  const safePage = Number.isFinite(page) ? Math.floor(page as number) : 1;
  const safeSize = Number.isFinite(pageSize) ? Math.floor(pageSize as number) : 10;
  if (safePage < 1) {
    throw new FieldValidationError('Page must be 1 or greater.');
  }
  if (safePage > 1000) {
    throw new FieldValidationError('Page must be 1000 or less.');
  }
  if (safeSize < 1 || safeSize > 50) {
    throw new FieldValidationError('Page size must be between 1 and 50.');
  }
  return { page: safePage, pageSize: safeSize };
}

/** Sequence 1 maps to the sample patient id P101. */
export function formatPatientId(sequence: number): string {
  return `P${100 + sequence}`;
}

/** Sequence 1 maps to A1001. */
export function formatAppointmentId(sequence: number): string {
  return `A${1000 + sequence}`;
}

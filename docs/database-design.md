# Database design

Database: MongoDB. Collections are independent documents. Relationships are stored as ids, not as embedded medical records.

## patients

| Field | Notes |
| --- | --- |
| patientId | Unique, system generated. Sequence 1 is `P101`. |
| firstName, lastName | Required, trimmed, max 80 characters. |
| dateOfBirth | Calendar date `YYYY-MM-DD`, not a timestamp. |
| email | Unique, stored lowercase. |
| phone | 7–15 digits. |
| createdBy | Email of the staff user who registered the patient. |
| createdAt, updatedAt | Mongoose timestamps. |

Indexes:

- Unique `patientId`
- Unique `email`
- `{ lastName: 1, firstName: 1 }` for ordered lists

Search is a case-insensitive regular expression on first name, last name, and patient id, with regex metacharacters escaped. The name index helps the sorted list. A leading-wildcard regex will not use that index efficiently. At a larger catalogue this should move to Atlas Search. Page size is capped at 50 and page number at 1000 so a search cannot request an unbounded skip.

## doctors

Seeded. No management UI.

| Field | Notes |
| --- | --- |
| doctorId | Unique. Seeded values start at `D201`. |
| name | Display name. |
| specialization | Free text. |

Index: unique `doctorId`.

## appointments

| Field | Notes |
| --- | --- |
| appointmentId | Unique. Sequence 1 is `A1001`. |
| patientId, patientName | Id plus the name captured at booking time. |
| doctorId, doctorName, specialization | Same snapshot approach. |
| startTime, endTime | UTC instants. The slot is 30 minutes in `CLINIC_TIMEZONE` (default `Asia/Kolkata`). |
| status | `BOOKED` or `CANCELLED`. |
| slotKey | Present only while `BOOKED`. Value is `doctorId|startTime.toISOString()`. |
| eventId | Unique id frozen on the appointment and reused for every publish attempt. |
| outboxStatus | `PENDING`, `PUBLISHING`, `PUBLISHED`, or `FAILED`. |
| publishAttempts, publishingStartedAt, lastPublishError | Retry bookkeeping. |
| createdBy | Staff email. |

Indexes:

- Unique `appointmentId`
- Unique `eventId`
- Unique sparse `slotKey`
- `{ doctorId: 1, status: 1, startTime: 1 }` for the overlap read and the day view
- `{ outboxStatus: 1, publishingStartedAt: 1 }` for the publisher
- `{ startTime: -1 }` for the appointment list

Names on the appointment are a snapshot. The exercise has no patient-edit flow, so the snapshot does not go stale. The patient collection remains the source of truth for the registry.

## notifications

| Field | Notes |
| --- | --- |
| eventId | Unique. This is the idempotency key. |
| appointmentId, patientId, patientName, doctorId, doctorName | Copied from the event. |
| message | `Appointment booked successfully for Patient P101 with Doctor D201.` |
| type | `APPOINTMENT_CONFIRMATION` |
| status | `RECORDED` |
| eventVersion | Copied from the event. |
| createdAt | When the consumer recorded it. |

Indexes:

- Unique `eventId`
- `{ createdAt: -1 }`
- `{ appointmentId: 1 }`

## users

Staff only. `email` is unique. `passwordHash` is bcrypt. `role` is `RECEPTIONIST` or `ADMIN`.

## counters

`{ key, seq }` allocates patient and appointment ids with an atomic `$inc`. Gaps are acceptable if a later insert fails.

## How double-booking is prevented

Appointments are aligned to clinic-local `:00` and `:30` boundaries, last start 16:30, duration 30 minutes. Under that rule, two bookings overlap if and only if they share a doctor and a start instant.

The service does two things:

1. It reads for an existing `BOOKED` appointment whose interval overlaps the requested slot, and returns a conflict if one is already visible.
2. It inserts the appointment with `slotKey`. The unique sparse index is the concurrency lock.

The read in step 1 can lose a race: two requests can both see an empty slot. Both then insert. MongoDB accepts one document and rejects the other with duplicate-key code `11000`. The service maps that error to the same conflict response. Cancellation `$unset`s `slotKey`. Because the index is sparse, cancelled documents are not in the index, so the slot can be booked again.

This depends on the index existing. Startup calls `syncIndexes()` and logs an error if the unique sparse `slotKey` index is missing. `autoIndex` stays on for this proof of concept. A production database should create the same index explicitly and then treat a missing index as a failed startup.

The overlap query is the domain rule a receptionist can understand. The unique index is what makes the rule hold when two requests arrive together. If a later change allowed arbitrary start times, the single `slotKey` would no longer cover partial overlaps and the lock would need to change.

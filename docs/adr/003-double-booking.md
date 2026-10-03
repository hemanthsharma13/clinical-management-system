# Unique sparse slot key for double-booking

## Context

Two receptionists can book the same doctor at the same time. An application-level "check then insert" loses that race. Appointments are fixed at 30 minutes on a clinic-local half-hour grid.

## Decision

Store UTC `startTime` and `endTime`. While an appointment is `BOOKED`, also store `slotKey = doctorId + "|" + startTime.toISOString()` and index it unique and sparse. On cancel, `$unset` `slotKey`. Map MongoDB duplicate key `11000` to a conflict. Keep the overlap query as a fast, readable check before insert.

## Alternatives

- Overlap query only.
- A lock document per doctor, or a Redis lock.
- A relational exclusion constraint over a time range.

## Trade-offs

The unique index is enforced by the database for every client, including a second API replica. Sparse means cancelled rows do not occupy the slot. The check-then-insert still improves the common error message; the index covers the race the check misses.

The index only matches identical start instants. That is correct while every booking is aligned and 30 minutes long. A free-form start time would need a different lock, because `09:15` would not collide with `09:00` on this key even though the visits overlap. The validation rules and this index have to stay in step.

# Outbox state on the appointment, at-least-once Kafka

## Context

A booking must survive a Kafka outage, and a consumer must tolerate duplicate delivery. MongoDB and Kafka cannot commit in one transaction.

## Decision

Keep publish state on the appointment document: `eventId`, `outboxStatus`, `publishAttempts`, `publishingStartedAt`. Insert the appointment as `PENDING`. A conditional update claims it, publishes `AppointmentBooked`, then marks `PUBLISHED`. The consumer inserts a notification keyed by unique `eventId` and commits the Kafka offset only after that write. Permanent bad messages go to `appointment.booked.dlq`.

## Alternatives

- Publish inside the booking request and fail the mutation if Kafka is down.
- A separate outbox collection plus a MongoDB multi-document transaction.
- At-most-once delivery by committing the offset before writing the notification.

## Trade-offs

The receptionist gets a saved appointment even when the broker is unavailable, and the poller catches up later. Claim expiry plus the unique `eventId` close the crash window between a successful publish and the `PUBLISHED` write. Duplicates are expected and harmless.

This is not a general transactional outbox across two databases. It works because the event state lives on the same document as the appointment. A consumer bug that commits before the insert would lose notifications; the code commits after the insert for that reason. After 10 failures the event stops retrying until an admin calls `retryAppointmentNotification`, so a poison broker error cannot spin forever without being visible.

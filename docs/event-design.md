# Event design

Topic: `appointment.booked`  
Dead-letter topic: `appointment.booked.dlq`  
Key: `appointmentId`  
Consumer group: `notification-service`

## Example

```json
{
  "eventId": "6f1c0e3a-2d4b-4a7e-9c1d-0b5a6e7f8091",
  "eventType": "AppointmentBooked",
  "eventVersion": "1.0",
  "occurredAt": "2026-10-02T04:12:08.000Z",
  "producer": "appointment-module",
  "payload": {
    "appointmentId": "A1001",
    "patientId": "P101",
    "patientName": "Asha Verma",
    "doctorId": "D201",
    "doctorName": "Dr. Ananya Rao",
    "startTime": "2026-10-05T03:30:00.000Z",
    "endTime": "2026-10-05T04:00:00.000Z"
  }
}
```

Headers on the Kafka record: `event-type`, `event-version`, `event-id`.

`occurredAt` is the appointment `createdAt`, not the time of a later retry, so a republish is the same body. `eventId` is allocated once when the appointment is inserted and is never regenerated.

The notification copy is:

`Appointment booked successfully for Patient P101 with Doctor D201.`

## Versioning

`eventVersion` is `major.minor`.

- A minor version may add optional fields. The consumer accepts any `1.x` payload that still has the required fields.
- A breaking change increments the major version. An unsupported major version is a permanent failure: the consumer writes the raw message to `appointment.booked.dlq` and commits the offset so one bad record does not block the partition.
- During a real migration the producer can dual-publish `1.x` and `2.x` until every consumer group has moved. This proof of concept publishes `1.0` only.

## Publishing and retries

The appointment insert and the outbox state are the same MongoDB document, so creating a `BOOKED` appointment with `outboxStatus: PENDING` is atomic. There is no second collection to commit.

A publisher then claims the document:

`PENDING` or a `PUBLISHING` claim older than 60 seconds → `PUBLISHING` → Kafka → `PUBLISHED`.

The claim is a conditional `findOneAndUpdate`. Two API replicas cannot both win it. If the process dies after Kafka accepts the record and before `PUBLISHED` is saved, the claim expires and another attempt publishes again. That is safe because the consumer deduplicates on `eventId`.

If Kafka is down, the booking mutation still succeeds. `publishAttempts` increments, `lastPublishError` is stored, and status returns to `PENDING`. The poller retries every `OUTBOX_POLL_MS` (default 5 seconds). After 10 failed attempts the status becomes `FAILED`. An admin can call `retryAppointmentNotification` to reset the counter and try again.

The producer is idempotent (`acks=all`, Kafka idempotent producer) so a retry inside one producer session is not written twice. That does not cover a second process publishing the same event after a crash. Consumer idempotency covers that case.

Cancelling a booking unsets the slot and sets `CANCELLED`. The publisher only claims `BOOKED` appointments, so a cancellation that wins before publish suppresses the confirmation. A cancellation that loses that race can still produce a confirmation for an appointment that was cancelled immediately afterward. There is no `AppointmentCancelled` event yet. That is a known limitation.

## Consumption, duplicates, and temporary failures

The consumer uses manual offset commits.

- A valid event calls `recordFromEvent`. The `notifications.eventId` unique index makes a second delivery a duplicate. The service treats duplicate-key `11000` as success and the offset is committed.
- Empty bodies, invalid JSON, an unexpected event type, and an unsupported major version go to the dead-letter topic and are then committed.
- A MongoDB outage or other transient error is thrown. The offset is not committed. KafkaJS retries and, if the consumer crashes, restarts. When the database returns, the same message is processed once.

`fromBeginning: true` only affects a new consumer group. After offsets are committed, a restart continues from the committed position. Replaying a topic still cannot create a second notification for the same `eventId`.

## Local fallback

`KAFKA_ENABLED=false` dispatches the same event object to the notification handler in-process. The handler and the unique `eventId` rule are unchanged. Docker Compose leaves Kafka enabled. Do not treat the in-process bus as a production transport.

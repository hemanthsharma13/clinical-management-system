# Harbor Clinic – Appointment Management System

| | |
| --- | --- |
| **Owner** | `<your name>` |
| **Status** | Proof of concept |
| **Last updated** | `<date>` |
| **Repository** | `<repo link>` |

## 1. Overview

Harbor Clinic is an administrative scheduling desk for a single clinic. Receptionists register patients, search them, book 30-minute appointments with doctors, and cancel bookings. Every booking publishes an `AppointmentBooked` event, which a notification worker turns into a confirmation record.

**Out of scope:** medical records, diagnoses, prescriptions, insurance, and payments. All patient data is fictional.

## 2. Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, Apollo Client |
| API | NestJS 10, GraphQL (code-first, single schema) |
| Database | MongoDB (Mongoose) |
| Messaging | Apache Kafka (KafkaJS) |
| Auth | JWT with roles (Receptionist, Admin) |
| Deployment | Docker Compose locally; Kubernetes on GKE (proposed) |

## 3. Architecture

A **modular monolith**: one NestJS application with separate modules. The Appointment and Notification modules communicate only through a Kafka event, so they can be split into separate services later without changing their contract.

```
                +---------------------------+
                |  React receptionist UI    |
                +-------------+-------------+
                              | GraphQL over HTTPS
                +-------------v-------------+
                |      NestJS GraphQL API   |
                |  Auth | Patient | Doctor  |
                |  Appointment (+ outbox)   |
                +------+-------------+------+
                       |             | publish AppointmentBooked
                       |             v
                       |    +------------------+
                       |    | Kafka topic      |
                       |    | appointment.     |
                       |    | booked           |
                       |    +--------+---------+
                       |             | consume
                       |    +--------v---------+     bad message
                       |    | Notification     +----------------> appointment.booked.dlq
                       |    | worker           |
                       |    +--------+---------+
                       v             v
                +---------------------------+
                |          MongoDB          |
                +---------------------------+
```

## 4. Modules

| Module | Responsibility | Data |
| --- | --- | --- |
| Auth | Login, JWT issue/validation, role checks | `users` |
| Patient | Register and search patients (IDs P101, P102, …) | `patients` |
| Doctor | Seeded doctor directory (D201–D204) | `doctors` |
| Appointment | Book, list, cancel; publish events (IDs A1001, …) | `appointments` |
| Notification | Consume events and store confirmations | `notifications` |

## 5. Key flows

**Booking**

1. The receptionist picks a patient, a doctor, and a free slot.
2. The API checks the slot and saves the appointment with outbox status `PENDING`.
3. The API responds to the UI right away.
4. The outbox publisher sends `AppointmentBooked` to Kafka, then marks the appointment `PUBLISHED`.
5. The notification worker stores: *"Appointment booked successfully for Patient P101 with Doctor D201."*

**Cancel:** the status becomes `CANCELLED` and the slot is free to book again.

## 6. Business rules

- Each appointment lasts exactly 30 minutes and starts on :00 or :30.
- Clinic hours run 09:00–17:00 (last start at 16:30), in timezone Asia/Kolkata.
- A unique database index prevents double-booking the same doctor and slot.
- Bookings in the past are rejected.

## 7. Reliability

| Concern | Handling |
| --- | --- |
| Kafka down | The booking still succeeds; the outbox retries every 5 s, up to 10 attempts, then `FAILED`. An admin can retry. |
| Duplicate events | Unique `eventId` on notifications; duplicates are ignored. |
| Bad messages | Sent to `appointment.booked.dlq`, and the offset is committed. |
| Database down | The offset is not committed; the message is processed again later. |

## 8. Security

- JWT bearer tokens that last 8 hours. Roles are checked on the server for every query and mutation.
- Receptionist: patients, appointments, notifications. Admin: everything, plus staff listing and notification retry.
- No secrets in the repository; production refuses a weak `JWT_SECRET`.
- Proposed production identity provider: Google Identity Platform.

## 9. Environments

| Environment | How to run |
| --- | --- |
| Local (no installs) | `npm run dev:local` in `backend` (in-memory MongoDB, Kafka off) and `npm run dev` in `frontend` |
| Local (full) | `docker compose up --build` (MongoDB, Kafka, API on :3000, UI on :8080) |
| Cloud (proposed) | GKE + MongoDB Atlas + Managed Kafka + Secret Manager |

**Demo logins:** `receptionist@harbor-clinic.test` / `receptionist123`, `admin@harbor-clinic.test` / `admin123`

## 10. Known limitations

- There is no `AppointmentCancelled` event yet.
- In-memory mode loses its data on restart.
- The Kubernetes manifests are sketches and have not been deployed.

## 11. Decisions (ADRs)

| ADR | Decision |
| --- | --- |
| 001 | Modular monolith over microservices |
| 002 | One GraphQL schema, no gateway |
| 003 | MongoDB with a unique slot index |
| 004 | Kafka with an outbox on the appointment document |
| 005 | JWT auth with roles; Identity Platform in production |

Full details are in `docs/` and `docs/adr/` in the repository.

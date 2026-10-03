# Harbor Clinic appointment desk

Reception staff can register fictional patients, search them, book 30-minute doctor appointments, cancel those appointments, and see the confirmation recorded from an `AppointmentBooked` event.

The API is a NestJS modular monolith with one GraphQL schema. Appointments and notifications are separate modules. MongoDB stores the data. Kafka carries the booking event when a broker is available.

Material parts of this repository were drafted with AI assistance in Cursor. The design and trade-offs are documented so they can be explained and changed directly.

## Run the application

Install dependencies once:

```bash
npm install --prefix backend
npm install --prefix frontend
```

### Laptop without MongoDB or Kafka

This starts an in-memory MongoDB and delivers the booking event inside the API process. Use it to click through the UI. It is not the Kafka path.

```bash
npm run dev:local --prefix backend
npm run dev --prefix frontend
```

Open http://localhost:5173.

The interactive engineering field guide is available at http://localhost:5173/docs. It is public and does not require signing in.

### MongoDB and Kafka already running

Copy `backend/.env.example` to `backend/.env` and point `MONGODB_URI` and `KAFKA_BROKERS` at those servers. Leave `KAFKA_ENABLED=true`.

```bash
npm run start:dev --prefix backend
npm run dev --prefix frontend
```

### Docker Compose

Requires Docker. This is the full local stack: MongoDB, Kafka, the API, and the built UI.

```bash
docker compose up --build
```

- UI: http://localhost:8080
- GraphQL: http://localhost:3000/graphql
- Health: http://localhost:3000/health/ready

From the host, Kafka is `localhost:9092`. Inside Compose the API uses `kafka:29092`.

### Sign in

| Role | Email | Password |
| --- | --- | --- |
| Receptionist | receptionist@harbor-clinic.test | receptionist123 |
| Admin | admin@harbor-clinic.test | admin123 |

Doctors `D201`–`D204` are seeded. Register a patient, book a slot, then open Notifications. Booking the same doctor and slot again returns a conflict. Cancelling frees the slot. The Staff page is visible for admin. A receptionist who calls `staffUsers` is rejected by the API.

Example operations are in `backend/examples/operations.graphql`.

## Tests

```bash
npm test --prefix backend
```

The tests cover slot rules, patient validation and duplicate email, booking conflicts including the duplicate-key race, cancellation clearing the slot, event publishing and retry, notification idempotency, event version handling, and role checks. They do not start MongoDB or Kafka.

## What is implemented

- React pages: sign in, register patient, patient search and pagination, book appointment, appointment list and cancel, notification list, admin staff list.
- GraphQL queries and mutations with backend validation.
- MongoDB persistence for patients, doctors, appointments, notifications, users, and id counters.
- Double-booking prevention: overlap check plus a unique sparse index on the doctor slot.
- `AppointmentBooked` publish with outbox state, retries, and an idempotent consumer.
- JWT authentication and role checks on the API.
- Docker Compose, Dockerfiles, and Kubernetes sketches.
- Architecture, data, event, security, deployment notes, and five decision records under `docs/`.

## What is incomplete

- No Google Cloud project is connected. Kubernetes manifests are not applied.
- Identity Platform is the proposed issuer. The running code signs its own development JWTs.
- `KAFKA_ENABLED=false` uses an in-process bus. Compose is the real broker path.
- No email or SMS provider. The notification module only stores a record.
- No doctor-management UI, patient edit, or `AppointmentCancelled` event.
- No automated browser test, and no test that runs against a live Kafka cluster.

## Assumptions

- One clinic, one timezone (`Asia/Kolkata` unless `CLINIC_TIMEZONE` is set).
- Appointments are exactly 30 minutes and start at `:00` or `:30`, from 09:00 through 16:30.
- Patient data entered in the UI is fictional.
- Admin can do everything a receptionist can, plus staff listing and notification retry.
- The browser will be pointed at this API with `CORS_ORIGIN`. The Vite dev server proxies `/graphql`.

## Known limitations

- Name search uses an escaped regular expression. It will not stay fast for a very large patient collection.
- A cancellation that happens in the same moment as a successful publish can still produce a confirmation. There is no cancel event to correct it.
- The API image still starts an HTTP port in worker mode so probes have something to call.
- Development passwords and the Compose JWT secret are obvious placeholders. Production startup rejects a placeholder `JWT_SECRET`.
- Tokens live in `sessionStorage`, which script on the page can read.

## With more time

- Connect Identity Platform and move the browser token to an httpOnly cookie.
- Run the consumer against Kafka in CI with Testcontainers.
- Add `AppointmentCancelled` and suppress or follow a confirmation when the visit is cancelled first.
- Add a patient-edit flow and decide whether appointment names stay snapshots.
- Replace regex search with Atlas Search, and add tracing so a booking and its notification share one correlation id.
- Alert on dead-letter volume and on appointments stuck in `FAILED`.

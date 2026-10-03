# Security design

## Tool

Production target: **Google Identity Platform** (Firebase Authentication on Google Cloud).

It fits the rest of the proposed platform, issues signed JWTs, and can map clinic staff to `RECEPTIONIST` and `ADMIN` through custom claims. The API would validate the token signature against Identity Platform's JWKS, check issuer and audience, and read the role from a custom claim.

This repository does not call Identity Platform. A local JWT issuer stands in so the desk runs without a cloud project. The backend boundary is the same shape: a bearer token, a guard on every patient and appointment operation, and a role loaded from the staff record rather than trusted from the client.

The trade-off is recorded in `docs/adr/005-authentication.md`.

## Local flow

1. `login` checks email and password. Unknown user and wrong password return the same `Invalid email or password.` message. Passwords are bcrypt hashes.
2. The API signs an HS256 JWT (`sub`, `email`, `role`) with `JWT_SECRET`. Default lifetime is 8 hours.
3. The React app keeps the token in `sessionStorage` and sends `Authorization: Bearer`.
4. `JwtStrategy` verifies the signature and expiry, then loads the user from MongoDB. The **database role** is what authorization uses, so a demotion applies on the next request even if the token still says `ADMIN`.
5. `RolesGuard` rejects a missing user with 401 and a disallowed role with 403.

Seeded accounts, created only when they do not already exist:

| Role | Email | Password |
| --- | --- | --- |
| RECEPTIONIST | receptionist@harbor-clinic.test | receptionist123 |
| ADMIN | admin@harbor-clinic.test | admin123 |

These passwords are development defaults. Production must not use them. In `NODE_ENV=production` the process refuses to start when `JWT_SECRET` is missing, shorter than 32 characters, or still contains `change-me` or `dev-only`.

## Authorization

Guards are on the resolvers, not only on the React routes.

- Receptionist and admin: patients, doctors, appointments, cancellations, notifications.
- Admin only: `staffUsers`, `retryAppointmentNotification`.

Hiding the Staff link in the UI is convenience. A receptionist who calls `staffUsers` receives `You do not have permission to perform this action.`

GraphQL introspection and the Apollo landing page are off when `NODE_ENV=production`.

## Token storage

`sessionStorage` is acceptable for this exercise and is cleared when the tab closes. It is readable by any script on the origin. A production desk should move the browser to an httpOnly, Secure, SameSite cookie issued by a small backend-for-frontend, and keep using Identity Platform as the identity source. The API would still validate the token itself.

## Secrets

- Local: `backend/.env`, which is gitignored. `.env.example` has only development placeholders.
- Compose: a clearly marked development JWT secret, and only while `NODE_ENV` is not production.
- Kubernetes: `clinic-secrets` from Secret Manager, mounted as environment variables. `secret.example.yaml` is not part of the kustomization and contains no real credentials.
- MongoDB and Kafka credentials belong in that secret, not in the ConfigMap.

## Other controls in this slice

- ValidationPipe whitelist, so unexpected GraphQL input fields are dropped.
- Patient search escapes regular-expression metacharacters and limits length.
- Page size and page number are capped.
- Logs do not include passwords or tokens. Publish failures log the appointment id and the broker error.
- Readiness fails when MongoDB is down. Kafka is not part of readiness, so a broker outage does not pull the API out of the load balancer. Bookings stay durable and the outbox retries. Liveness is process health only.

Not in this slice: refresh tokens, MFA, account lockout, rate limiting, audit log of every read, and field-level encryption. Identity Platform would own MFA and password policy.

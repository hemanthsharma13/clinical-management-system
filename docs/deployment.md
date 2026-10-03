# Deployment design

A paid Google Cloud project is not required. The manifests in `infrastructure/k8s/` are the intended shape and have not been applied to a cluster.

## Containers

| Image | Process |
| --- | --- |
| `backend` | NestJS. `PROCESS_ROLE=all` locally, `api` or `worker` in the cluster. |
| `frontend` | nginx serving the Vite build and proxying `/graphql` and `/health` to the API. |

Images are built from the Dockerfiles and would be pushed to Artifact Registry, for example `REGION-docker.pkg.dev/PROJECT/clinic/backend:<git-sha>`.

## Runtime configuration

Non-secret settings live in the `clinic-config` ConfigMap: timezone, Kafka topic, consumer group, CORS origin.

Secrets live in `clinic-secrets`: `JWT_SECRET`, `MONGODB_URI`, and the initial staff passwords. In Google Cloud those values come from Secret Manager and are synced into the Kubernetes secret. The example secret file is not applied by kustomize.

## Google Cloud layout

- **GKE** runs two deployments of the backend image.
  - `clinic-api` (`PROCESS_ROLE=api`) serves GraphQL and publishes booking events. The public Service selects only this deployment.
  - `clinic-notification-worker` (`PROCESS_ROLE=worker`) consumes `appointment.booked`. It is not behind the ingress. It still exposes `/health/live` and `/health/ready` for probes.
- **MongoDB Atlas** on Google Cloud, or another managed MongoDB. The unique sparse `slotKey` index from `docs/database-design.md` is created before traffic is sent. The app also calls `syncIndexes()` on startup for this proof of concept.
- **Google Cloud Managed Service for Apache Kafka** for `appointment.booked` and `appointment.booked.dlq`. Three partitions are enough for this load. Consumer replicas should not exceed the partition count.
- **Identity Platform** issues staff tokens. See `docs/security.md`.
- **Ingress** (GCE class) routes `/graphql` and `/health` to the API and `/` to the frontend. TLS terminates at the load balancer.
- **Cloud Logging** collects stdout from both deployments. Nest logs to stdout. No log agent is bundled in the image.
- **Cloud Monitoring** would alert on consumer lag, DLQ rate, `outboxStatus=FAILED`, and readiness failures. Those alerts are not configured here.

## Health, scaling, and rollback

- Liveness: `GET /health/live` returns ok when the process can answer.
- Readiness: `GET /health/ready` returns 503 until MongoDB is connected. Kafka is intentionally excluded so a broker incident does not drop the API from the Service.
- API rolling update: `maxUnavailable: 0`, `maxSurge: 1`.
- Suggested requests: API and worker 100m CPU / 256Mi, frontend 50m / 64Mi. Limits are in the manifests.
- Scale the API on CPU. Scale the worker on consumer lag, up to the number of partitions.
- Rollback: `kubectl rollout undo deployment/clinic-api` and the same for the worker and frontend. Because API and worker share an image tag, roll them to the same known-good tag together. Database changes in this design are additive indexes and new optional fields, so the previous image can still read the data.

Local equivalent:

```bash
docker compose up --build
```

The API is on port 3000 and the built UI is on port 8080. Kafka inside Compose is `kafka:29092`. From the host machine it is `localhost:9092`.

## What is not deployed

These manifests are documentation of the target. They use placeholder image tags and `clinic.example.com`. They do not create Atlas, Managed Kafka, or Identity Platform.

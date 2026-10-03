# Modular monolith instead of microservices

## Context

The clinic needs three business areas: patients, appointments, and notifications. The notification path is asynchronous. The exercise also asks for something that can be run and explained as a vertical slice.

## Decision

Ship one NestJS application with module boundaries that match those business areas. The notification consumer can run in the same process (`PROCESS_ROLE=all`) or in a second deployment of the same image (`PROCESS_ROLE=worker`).

## Alternatives

- Three network services on day one, each with its own database and pipeline.
- A monolith that keeps notification logic inside the appointment service with a direct function call and no event.

## Trade-offs

One process is easier to test, debug, and run locally. A booking does not need a distributed transaction across services. The cost is that a bad deploy can take the API and the consumer down together when `PROCESS_ROLE=all`. The worker deployment avoids that in the target cluster, with the remaining coupling that both roles share a release. Splitting the notification module into its own repository is a later move, and the event contract is already the seam.

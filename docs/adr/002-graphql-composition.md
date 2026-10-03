# One GraphQL schema, no gateway

## Context

The React desk needs patients, doctors, appointments, and notifications. The brief allows several GraphQL schemas if the way they are combined is explained, and it says not to add a gateway only to demonstrate one.

## Decision

Use NestJS code-first GraphQL. Each module contributes resolvers. Nest builds a single schema in memory (`autoSchemaFile: true`). The browser sends every operation to `/graphql`.

## Alternatives

- REST resources for the same use cases.
- A schema-per-service design with Apollo Router or a similar gateway stitching them.

## Trade-offs

One schema matches a modular monolith: there is one deployable, so a gateway would only add a hop and an extra failure mode. Clients can ask for the appointment fields they need in one round trip, which fits the booking screen. The cost is that GraphQL complexity and authorization have to be handled in this process. Mutations stay coarse (`bookAppointment`, `cancelAppointment`) rather than a general write API. REST would have been simpler for a few forms, but the brief asks for GraphQL and the UI is small enough that one schema stays understandable.

If the notification worker were later split into a service that the browser should query directly, that is the point to reconsider a gateway. It is not useful now.

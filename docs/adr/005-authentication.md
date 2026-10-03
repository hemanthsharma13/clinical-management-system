# Local JWT now, Identity Platform later

## Context

The desk needs receptionist and admin roles, and the backend must enforce them. The proposed cloud is Google Cloud. The slice also has to run on a laptop without a cloud account.

## Decision

Target Google Identity Platform as the staff identity provider. Implement the API against a bearer JWT and a role check. Until Identity Platform is connected, the API signs development tokens itself after a bcrypt password check, and every authorized request reloads the role from MongoDB.

## Alternatives

- Run Keycloak in Docker Compose.
- Hide buttons in React and skip backend checks.
- Block the exercise on a real Identity Platform tenant.

## Trade-offs

The guards, error codes, and role model are what a production token check would use. Swapping the issuer means replacing `JwtStrategy` with JWKS verification and custom claims, not rewriting the resolvers.

The local issuer is a weaker system: one shared HMAC secret, passwords in the application database, and a token in `sessionStorage`. That is acceptable only outside production. The process refuses a placeholder `JWT_SECRET` when `NODE_ENV=production`. Keycloak would have been a fuller local IdP and a heavier Compose file for the same guard code.

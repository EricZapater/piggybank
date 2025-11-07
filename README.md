# Piggybank

Piggybank is an application that helps couples manage shared savings goals through piggybanks, voucher-based rewards, and action tracking. The project is split into a Go backend and a React Native (Expo) mobile frontend.

## Project Structure

```
backend/
  cmd/server        # HTTP server bootstrap
  internal/         # Domain modules following clean architecture boundaries
  migrations/       # Database migrations (golang-migrate compatible)
frontend/
  App.tsx           # Expo entrypoint
  src/              # Screens, components, hooks, and API clients
```

## Requirements

- Go 1.22+
- Node.js 18+ (Expo recommends 18 LTS or later)
- PostgreSQL 14+ (hosted remotely per project setup)
- golang-migrate CLI for applying migrations

## Getting Started

1. Copy the environment template and update the values:

   ```sh
   cp .env.example .env
   ```

2. Install backend dependencies and run the server:

   ```sh
   cd backend
   go run ./cmd/server
   ```

3. Apply database migrations (adjust the connection string as needed):

   ```sh
   migrate -path ./migrations -database "$DATABASE_URL" up
   ```

4. Install frontend dependencies and start the Expo dev server:
   ```sh
   cd ../frontend
   npm install
   # Optional: override the backend URL used by the mobile app
   echo "EXPO_PUBLIC_API_URL=http://localhost:8080" >> .env
   npm run start
   ```

## Docker Compose

The provided `docker-compose.yml` orchestrates the backend and Expo frontend without bundling a PostgreSQL container. Configure `DATABASE_URL` to point to your remote instance before running:

```sh
docker compose up --build
```

## Migrations

Migrations are located in `backend/migrations` and follow the standard `golang-migrate` naming convention. Ensure the remote database has the required extensions (`uuid-ossp` or handles UUID generation on the application side).

## Auth API (Iteration 1)

- `POST /auth/register` – accepts `{ "email", "password", "name" }`, creates a user, returns `{ token, user }`.
- `POST /auth/login` – accepts `{ "email", "password" }`, returns `{ token, user }`.
- `GET /auth/me` – requires `Authorization: Bearer <token>` header and returns the authenticated user profile.

Tokens are JWT (HS256) with a default 7-day expiration configured via `JWT_ACCESS_TTL`.

Set `EXPO_PUBLIC_API_URL` (either via `.env` or `app.config.js`) to point the mobile client at the running backend instance.

## Couples API (Iteration 2)

- `POST /couples/request` – body `{ "partnerEmail" }`, creates a pending couple invitation.
- `POST /couples/accept` – body `{ "requestId" }`, accepts a pending invitation and creates the couple.
- `GET /couples/me` – returns the authenticated user's couple (if any) plus pending incoming/outgoing invitations.

Only authenticated users can access these routes and they may only view invitations involving their account.

# Grava Nóis API

## Overview
Grava Nóis API is a TypeScript/Express backend that powers the Grava Nóis video platform. It handles Supabase-based authentication, video ingestion and storage on AWS S3, contact and feedback forms, and operational tooling for client/venue management.

## Architecture Highlights
- Express with TypeScript, structured around feature routers in `src/routes`.
- TypeORM for the primary PostgreSQL database (`grn_*` schemas) and `postgres` tagged template for Supabase profile access.
- AWS SDK v3 for S3 uploads, presigned URLs, and object verification.
- Nodemailer for transactional e-mail delivery via SMTP.
- Optional RabbitMQ integration prepared for clip pipeline fan-out (`src/rabbitmq`).
- Dockerfile and docker-compose recipe for production-style deployments on port `2399`.

## Prerequisites
- Node.js 20+
- PostgreSQL 14+ (primary Grava Nóis database)
- A Supabase project (profiles table lives in Supabase)
- AWS S3 bucket and credentials
- SMTP credentials for outbound e-mail
- (Optional) RabbitMQ broker
- (Optional) Secondary PostgreSQL database for Felix3D routes

## Environment Configuration
Create a `.env` file for development (the app loads `.env` when `NODE_ENV=development` and `.env.production` otherwise). All variables below are validated on startup.

### Core service
| Variable | Required | Description |
| --- | --- | --- |
| `NODE_ENV` | no | Defaults to `development`; toggles config file and TypeORM sync. |
| `PORT` | no | API port in development (default `3000`). |
| `BACKEND_PUBLIC_URL` | yes | Public base URL used to build Supabase OAuth callbacks. |
| `COOKIE_SAME_SITE` | yes | SameSite strategy for Supabase auth cookies (`lax`, `strict`, `none`). |
| `SUPABASE_URL` | yes | Supabase project URL. |
| `SUPABASE_SERVICE_KEY` | yes | Service role key used for backend operations. |
| `SUPABASE_PUBLISHABLE_KEY` | yes | Public anon key needed to bootstrap SSR client. |
| `SUPABASE_DATABASE` | yes | Connection string for direct SQL access to Supabase (used by `src/config/pg.ts`). |

### Primary PostgreSQL (TypeORM)
| Variable | Required | Description |
| --- | --- | --- |
| `DB_HOST` | yes (production) | Host of the Grava Nóis database. |
| `DB_PORT` | yes (production) | Port (default `5432`). |
| `DB_USER` | yes (production) | Database user. |
| `DB_PASSWORD` | yes (production) | Database password. |
| `DB_NAME` | yes (production) | Database name. |

### AWS S3
| Variable | Required | Description |
| --- | --- | --- |
| `AWS_ACCESS_KEY_ID` | yes | Access key for the bucket. |
| `AWS_SECRET_ACCESS_KEY` | yes | Secret key. |
| `AWS_REGION` | yes | Region (e.g. `sa-east-1`). |
| `S3_BUCKET_NAME` | yes | Bucket storing clip uploads. |

### SMTP / E-mail
| Variable | Required | Description |
| --- | --- | --- |
| `EMAIL_HOST` | no | SMTP host (defaults to `smtp.gmail.com`). |
| `EMAIL_USER` | yes | SMTP username. |
| `EMAIL_PASS` | yes | SMTP password or app token. |

### RabbitMQ (optional)
| Variable | Required | Description |
| --- | --- | --- |
| `RABBITMQ_URL` | yes (production) | Connection URI for clip events exchange (defaults to `amqp://localhost` in dev). |

## Installation & Local Development
1. Install dependencies: `npm install`.
2. Create `.env` and populate the variables above. Provide valid credentials for both databases, Supabase, AWS, and SMTP.
3. Prepare the PostgreSQL database schemas (`grn_clients`, `grn_core`, `grn_billing`, `grn_videos`). The initial TypeORM migration creates the required tables: `npm run migration:run`.
4. Start the development server with live reload: `npm run dev`. The API listens on `http://localhost:3000` by default.

### Useful scripts
- `npm run build` – compile TypeScript to `dist`.
- `npm run migration:generate -- <Name>` – scaffold a migration using the current entity state.
- `npm run migration:run` / `npm run migration:revert` – apply or rollback migrations.
- `npm run typeorm -- <command>` – access the TypeORM CLI wrapper. Tests are not yet implemented.

## Running with Docker
1. Provide a `.env.production` file in the project root.
2. Build and run: `docker compose up --build`.
3. The container exposes port `2399` (mapped in `docker-compose.yml`); adjust the compose file if you prefer a different host port.

## Project Structure
```
src/
  config/          // database, env, S3, Supabase clients
  middlewares/     // future middleware hooks
  migrations/      // TypeORM migrations
  models/          // TypeORM entities (clients, venues, payments, videos)
  rabbitmq/        // connection helpers for the clips exchange
  routes/          // Express routers grouped by feature
  services/        // business logic (video service)
  types/           // shared custom types/errors
```

## API Overview
Endpoints are grouped by router; all responses are JSON unless noted.

### Health & Misc
- `GET /` – Basic health check.

### Authentication (Supabase-backed)
- `POST /sign-in` – Email/password sign-in; sets Supabase session cookies.
- `POST /sign-up` – Email/password registration; Supabase confirmation rules apply.
- `POST /sign-out` – Clears Supabase auth cookies.
- `GET /auth/me` – Returns current Supabase user and profile (`grn_auth.profiles`).
- `GET /auth/login/google?next=/path` – Initiates Google OAuth flow.
- `GET /auth/callback` – Handles Supabase OAuth callback.

### Video Ingestion & Library
- `POST /api/videos/metadados/client/:clientId/venue/:venueId` – Registers clip metadata and returns an S3 signed upload URL.
- `POST /api/videos/:videoId/uploaded` – Verifies the uploaded object and updates status (`uploaded` or `uploaded_temp`).
- `GET /api/videos/list?prefix=&limit=&offset=&order=` – Lists objects within the S3 bucket.
- `GET /api/videos/sign?path=&kind=&ttl=` – Issues a presigned URL for preview/download of a stored clip.
- `GET /videos-clips?venueId=` – Returns all clips for a venue with short-lived signed URLs.

### Client & Venue Management
- `POST /api/clients/` – Creates a client record (requires `legalName`, `email`, and either `cnpj` or `responsibleCpf`).
- `POST /api/venue-installations/:clientId` – Registers a venue installation tied to a client.
- `GET /quadrasFiliadas` – Lists registered venues (work-in-progress route).

### User Profiles
- `GET /users/:id` – Fetches Supabase profile data.
- `PATCH /users/:id` – Updates mutable fields on a profile (diff-based).

### Contact & Feedback Forms
- `POST /send-email` – Sends lead/prospect information to the configured inbox.
- `POST /send-report` – Sends internal bug reports with optional reproduction steps.
- `POST /send-feedback` – Sends general feedback from the site.

### Felix3D Temporary Endpoints
These routes target a separate database (via `TEMP_DB_*` variables) and are intended for internal tooling:
- `GET/POST/PUT/DELETE /temp_felix3d/pedidos`
- `GET/POST/PUT/DELETE /temp_felix3d/produtos`
- `GET/POST/PUT/DELETE /temp_felix3d/financeiro`

## Data Model Summary
Entities live in the `grn_*` schemas:
- `Client` (`grn_clients.clients`) – Identifies an organization, contact info, and payment linkage.
- `VenueInstallation` (`grn_core.venue_installations`) – Tracks camera installations, contract method, and operational metadata.
- `Payment` (`grn_billing.payments`) – Logs billing events and provider identifiers.
- `Video` (`grn_videos.videos`) – Represents clips, storage path, contract type, upload status, and metadata.

The initial migration (`src/migrations/1755169373372-InitialMigration.ts`) sets up all four tables plus enums and indexes.

## Background Jobs & Integrations
- **S3 uploads** – `VideoService.createSignedUrlVideo` generates presigned PUT URLs; `VideoService.finalizeUpload` validates objects via `HeadObjectCommand`.
- **RabbitMQ** – Prepared helper (`publishClipEvent`) to emit clip events to the `grn.clips` topic exchange. Publishing is currently commented out in `src/index.ts`.
- **Supabase** – `@supabase/ssr` manages auth cookies with server-side helpers; `supabaseDb` template supports direct profile queries.
- **Nodemailer** – Sends HTML and plaintext variants for lead, bug report, and feedback workflows.

## Notes & Next Steps
- Automated tests are not yet defined; consider adding integration tests around video ingestion and Supabase auth flows.
- Middleware scaffolding (`src/middlewares/auth.middleware.ts`) is empty and ready to host shared guards when access control is introduced.
- Monitor environment validation errors early—`src/config/dotenv.ts` will throw on missing variables to prevent silent misconfiguration.

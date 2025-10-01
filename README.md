# Video Web Application

## 1. Executive Summary
This repository contains a full-stack video management platform designed for authenticated uploading, transcoding, and streaming of user-generated content. The system is composed of a React/Vite single-page client, an Express-based API, AWS-managed persistence (DynamoDB + S3), and AWS-managed identity (Cognito + Secrets Manager + Parameter Store). Runtime video processing such as metadata extraction, thumbnail generation, and MP4 transcoding relies on FFmpeg. Supporting scripts and Docker assets are provided for local development and containerised deployment.

## 2. System Architecture Overview
- **Client (React + Vite)** — renders the dashboard, orchestrates authentication and upload flows, and talks to the API over HTTPS. Configuration for API URLs and Cognito is loaded dynamically from the backend during boot.【F:client/src/App.jsx†L1-L84】【F:client/src/api.js†L1-L101】
- **API Server (Express)** — exposes REST endpoints for authentication, video lifecycle operations, and configuration discovery. It bootstraps AWS settings, enforces JWT-based auth, and proxies streaming through presigned URLs.【F:server/src/index.js†L1-L74】
- **Identity & Secrets** — Registration flows forward to AWS Cognito while login relies on a local credential store seeded during registration. JWT signing keys come from AWS Secrets Manager (`n11817143-a2-secret`).【F:server/src/auth/auth.controller.js†L1-L99】【F:server/src/utils/secrets.js†L1-L55】
- **Persistence & Media Storage** — Metadata is stored in DynamoDB (table resolved from Parameter Store). Binary objects are stored in S3 using parameterised prefixes. Upload and transcoding steps utilise temporary disk space before persisting to S3.【F:server/src/videos/video.service.js†L1-L212】【F:server/src/videos/video.repo.dynamo.js†L1-L121】
- **Configuration Source of Truth** — Runtime configuration is pulled from AWS Systems Manager Parameter Store under `/n11817143/app/*`, with fallbacks to environment variables for emergency operation.【F:server/src/config.js†L32-L86】【F:server/src/utils/parameterStore.js†L1-L146】

## 3. Backend Service (Express API)
### 3.1 Boot Process
`server/src/index.js` creates the Express instance, configures CORS, JSON parsing, health/config endpoints, and then loads secrets/parameters before accepting traffic. Local directories for transient media files are created on startup.【F:server/src/index.js†L11-L66】

### 3.2 Authentication Flow
- **Registration**: Validated credentials are sent to Cognito. On success, a local password hash is persisted and the user is added to a lightweight JSON user registry for downstream logins.【F:server/src/auth/auth.controller.js†L1-L53】【F:server/src/auth/password.store.js†L1-L63】
- **Confirmation & Resend**: Cognito verification codes are surfaced via `/api/auth/confirm` and `/api/auth/resend` routes.【F:server/src/auth/auth.routes.js†L1-L33】
- **Login**: The API trusts only locally stored password hashes, issues HS256 JWTs using the Secrets Manager key, and exposes the authenticated profile via `/api/auth/me`.【F:server/src/auth/auth.controller.js†L55-L87】【F:server/src/auth/jwt.js†L1-L17】
- **Request Guard**: `authMiddleware` verifies bearer tokens or `token` query params before granting access to any `/api/videos/*` route.【F:server/src/auth/auth.middleware.js†L1-L27】

### 3.3 Video Lifecycle
1. **Upload**: Authenticated users submit multipart uploads. Files are written to disk, probed with FFmpeg, thumbnailed, then pushed to S3 (raw + thumbnail prefixes). Metadata is persisted in DynamoDB and local temp files are removed.【F:server/src/videos/video.routes.js†L1-L46】【F:server/src/videos/video.service.js†L64-L145】
2. **Listing & Retrieval**: Videos are paginated per owner via DynamoDB queries. Individual records are fetched with owner scoping to prevent cross-tenant leakage.【F:server/src/videos/video.service.js†L150-L189】【F:server/src/videos/video.repo.dynamo.js†L61-L88】
3. **Streaming**: Requests redirect to short-lived presigned URLs (original or transcoded variants). Optional `download` flags force attachment disposition.【F:server/src/videos/video.service.js†L191-L228】
4. **Transcoding**: A 720p MP4 pipeline downloads the source from S3 (if necessary), transcodes with FFmpeg, uploads the result to the transcoded prefix, and updates status to `ready`. Failures mark the record `failed` for operator visibility.【F:server/src/videos/video.service.js†L230-L315】
5. **Deletion**: Removes S3 objects across all prefixes and deletes the DynamoDB record.【F:server/src/videos/video.service.js†L210-L227】

### 3.4 Error Handling & Validation
All async handlers funnel through a central error middleware that standardises payloads and status codes. Request bodies are validated with Zod schemas before hitting controllers.【F:server/src/utils/errors.js†L1-L45】【F:server/src/utils/validate.js†L1-L23】

## 4. Frontend Application (React + Vite)
- **Composition**: `<App>` manages auth state, toast notifications, and conditional rendering between `<Login>` and `<Dashboard>`. Cognito configuration is fetched from the API and initialised through Amplify.【F:client/src/App.jsx†L1-L84】【F:client/src/cognito.config.js†L1-L48】
- **Networking**: `client/src/api.js` normalises the backend base URL, injects bearer tokens, and exposes helpers for all REST operations plus presigned URL construction.【F:client/src/api.js†L1-L135】
- **Pages & Components**: The login page orchestrates registration/verification workflows, while the dashboard coordinates uploads, pagination, selection, transcoding, and deletion. Supporting components handle UI interactions and video playback.【F:client/src/pages/Login.jsx†L1-L160】【F:client/src/pages/Dashboard.jsx†L1-L93】【F:client/src/components/VideoList.jsx†L1-L96】
- **Styling**: Tailored CSS (dark theme) lives in `client/src/styles.css` and is loaded globally via Vite.【F:client/src/styles.css†L1-L192】

## 5. Configuration & Secrets Management
### 5.1 Parameter Store Keys (Prefix `/n11817143/app`)
| Key | Purpose |
| --- | --- |
| `cognitoClientId`, `cognitoUserPoolId` | Cognito identifiers surfaced to the client and used by the API.【F:server/src/utils/parameterStore.js†L101-L137】 |
| `domainName` | Used for telemetry and client defaults.【F:server/src/config.js†L41-L86】 |
| `dynamoTable`, `dynamoOwnerIndex` | DynamoDB table + index names for metadata storage.【F:server/src/utils/parameterStore.js†L101-L137】 |
| `s3Bucket`, `s3_raw_prefix`, `s3_thumbnail_prefix`, `s3_transcoded_prefix` | S3 bucket + key prefixes for raw, thumbnail, and transcoded assets.【F:server/src/config.s3.js†L1-L26】 |
| `maxUploadSizeMb`, `preSignedUrlTTL` | Upload limits and presigned URL TTL (seconds).【F:server/src/utils/parameterStore.js†L101-L137】 |

Use `server/parameter-cli.js` to list, validate, or clear cached values locally.【F:server/parameter-cli.js†L1-L139】

### 5.2 Secrets Manager
- **Secret Name**: `n11817143-a2-secret`
- **Contract**: Must provide either `{ "JWT_SECRET": "..." }` JSON or a raw string. Fallback is `process.env.JWT_SECRET` (default `change_me`).【F:server/src/utils/secrets.js†L33-L52】

### 5.3 Environment Variables
- **Server**: `PORT`, `AWS_REGION`, `CLIENT_ORIGINS`, `JWT_SECRET`, `USE_DYNAMO`, `USE_LOCAL_STORAGE`, `LIMIT_FILE_SIZE_MB`, `PRESIGNED_URL_TTL`. Dynamo mode must remain enabled because the SQLite adapter is deprecated and throws on usage.【F:server/src/config.js†L18-L70】【F:server/src/db.js†L1-L15】【F:server/src/videos/video.repo.js†L1-L24】
- **Client**: `VITE_API_URL`, `VITE_COGNITO_USER_POOL_ID`, `VITE_COGNITO_CLIENT_ID`, `VITE_AWS_REGION`. Default API origin is `https://n11817143-videoapp.cab432.com` when unset.【F:client/src/api.js†L1-L25】【F:client/src/cognito.config.js†L4-L27】

## 6. Infrastructure Requirements
- **AWS DynamoDB**: Table with `ownerId` (partition key) + `videoId` (sort key) and optional `OwnerIndex` GSI. `server/create-dynamodb-table.js` illustrates the expected schema.【F:server/create-dynamodb-table.js†L1-L55】
- **AWS S3**: Bucket with three logical prefixes matching Parameter Store values. Lifecycle rules should be considered for orphaned transcodes.
- **AWS Cognito**: User Pool + App Client without a client secret to match the simplified flows. Email attribute must be enabled for verification codes.【F:server/src/auth/cognito.service.js†L1-L125】
- **AWS Systems Manager Parameter Store & Secrets Manager**: Provide configuration and signing secrets as described above.
- **FFmpeg**: Required on all runtime hosts for metadata probing, thumbnails, and transcoding. Base Docker images install it during build.【F:Dockerfile†L4-L37】【F:server/Dockerfile†L3-L19】

IAM policies for the API host must allow read access to the specified S3 bucket/prefixes, CRUD access to the DynamoDB table, `ssm:GetParameter(s)`, and `secretsmanager:GetSecretValue` on the referenced resources.

## 7. Local Development Workflow
1. **Prerequisites**: Node.js ≥ 22 and npm ≥ 10 (root `package.json` enforces engines).【F:package.json†L30-L33】
2. **Install Dependencies**: `npm run install:all` from the repo root installs server + client packages.【F:package.json†L11-L18】
3. **Seed Configuration**: Either provision AWS resources and credentials locally, or provide environment fallbacks:
   ```bash
   export AWS_REGION=ap-southeast-2
   export USE_DYNAMO=true
   export CLIENT_ORIGINS=http://localhost:3000
   export JWT_SECRET=local-dev-secret
   export LIMIT_FILE_SIZE_MB=512
   export PRESIGNED_URL_TTL=600
   export VITE_API_URL=http://localhost:8080
   ```
   When AWS services are unavailable, ensure equivalent mock endpoints exist or adjust the code paths accordingly.
4. **Run Concurrent Dev Servers**: `npm run dev` launches `nodemon` for the API and Vite for the client (via `concurrently`).【F:package.json†L11-L18】
5. **Alternative**: `docker-compose up --build` brings up separate backend/frontend containers with sensible defaults and file volume mounts for local inspection.【F:docker-compose.yml†L1-L24】

## 8. Deployment Guidance
- **Monolithic Image**: The root `Dockerfile` builds both server and client, installs FFmpeg, and runs them in a single container exposing ports 8080/3000 with a simple supervisor script.【F:Dockerfile†L1-L54】
- **Service-Specific Images**: `server/Dockerfile` and `client/Dockerfile` provide standalone images for the API and Vite dev server respectively.【F:server/Dockerfile†L1-L23】【F:client/Dockerfile†L1-L19】
- **Start Scripts**: `start-app.sh` is tailored for the production host at `n11817143-videoapp.cab432.com` and simply proxies to `npm run dev`; adapt or replace for real deployments.【F:start-app.sh†L1-L18】
- **Health Checks**: Dockerfiles include HTTP health checks against `/api/health` to integrate with orchestrators.【F:Dockerfile†L43-L54】【F:server/Dockerfile†L18-L22】

## 9. Operations & Maintenance
- **Parameter CLI**: Run `node parameter-cli.js list|validate|get|clear-cache` inside `server/` to inspect live configuration cached from Parameter Store.【F:server/parameter-cli.js†L1-L139】
- **Local Credential Stores**: Registered/confirmed Cognito users and hashed passwords are persisted under `server/data/*.json`; include these files in backups if hybrid auth must be retained.【F:server/src/auth/user.store.js†L1-L59】【F:server/src/auth/password.store.js†L1-L59】
- **Logs & Monitoring**: The API uses Morgan for HTTP access logs; redirect stdout/stderr to your log aggregation stack.【F:server/src/index.js†L15-L21】
- **Housekeeping**: Successful uploads delete local temp files automatically. Investigate `server/src/public/videos/tmp` if disk usage grows, particularly after failed transcodes.【F:server/src/videos/video.service.js†L36-L46】【F:server/src/videos/video.service.js†L230-L315】

## 10. Testing & Quality Gates
- **Smoke Script**: `npm run test` executes `test-app.sh`, which performs DNS, HTTP, dependency, and process checks against the canonical deployment. Tailor or fork this script for your environment.【F:package.json†L11-L19】【F:test-app.sh†L1-L86】
- **Linting**: Run `npm --prefix server run lint` and `npm --prefix client run lint` for static analysis using ESLint configs included with each package.【F:server/package.json†L6-L17】【F:client/package.json†L6-L16】
- **Manual Verification**: Validate upload/transcode/delete flows end-to-end using the dashboard and confirm S3/DynamoDB state changes.

## 11. API Reference (Summary)
| Method & Path | Description | Auth |
| --- | --- | --- |
| `GET /api/health` | Health probe | None |
| `GET /api/config` | Exposes Cognito + domain settings for SPA bootstrap | None |
| `POST /api/auth/register` | Register via Cognito + seed local password store | No |
| `POST /api/auth/login` | Issue JWT using local password store | No |
| `POST /api/auth/confirm` | Confirm Cognito sign-up with code | No |
| `POST /api/auth/resend` | Resend Cognito confirmation code | No |
| `GET /api/auth/me` | Return authenticated user profile | Bearer token |
| `POST /api/videos/upload` | Multipart video upload | Bearer token |
| `GET /api/videos` | Paginated list of user videos (`page`, `limit`) | Bearer token |
| `GET /api/videos/:id` | Fetch single video metadata | Bearer token |
| `GET /api/videos/:id/stream` | Redirect to presigned stream/download URL (`variant`, `download`) | Bearer token or `token` query |
| `POST /api/videos/:id/transcode` | Trigger 720p transcode (`preset`) | Bearer token |
| `GET /api/videos/:id/thumbnail` | Redirect to presigned thumbnail URL | Bearer token |
| `DELETE /api/videos/:id` | Delete video and assets | Bearer token |
Routes throw standardised JSON errors when validation/auth fails.【F:server/src/videos/video.routes.js†L1-L46】【F:server/src/utils/errors.js†L1-L45】

## 12. Data Lifecycle & Storage
- **Metadata**: Persisted per-owner in DynamoDB with timestamps for auditing and status transitions for operational visibility.【F:server/src/videos/video.repo.dynamo.js†L24-L112】
- **Binary Assets**: Uploaded files are always promoted to S3; local disk is used temporarily for uploads, thumbnails, and transcodes even in S3 mode.【F:server/src/videos/video.service.js†L36-L132】
- **User Credentials**: Local JSON stores keep a copy of confirmed users and Bcrypt password hashes to support the hybrid login flow.【F:server/src/auth/user.store.js†L29-L57】【F:server/src/auth/password.store.js†L27-L55】

## 13. Security Considerations
- JWT secret and AWS credentials must never be committed; leverage Parameter Store + Secrets Manager and environment variables.
- Ensure HTTPS termination in front of both services; Vite dev server exposes credentials locally, so restrict to trusted networks.
- Consider migrating login to Cognito tokens end-to-end to avoid storing password hashes locally once Cognito policies allow full authentication.

## 14. Troubleshooting Checklist
| Symptom | Likely Cause | Fix |
| --- | --- | --- |
| API fails on boot with `Failed to load configurations` | Parameter Store/Secrets Manager access denied or missing keys | Validate IAM permissions and run `node parameter-cli.js validate` | 
| Uploads fail with `Unable to process uploaded video` | FFmpeg missing or misconfigured | Confirm FFmpeg install (`ffmpeg -version`) and sufficient temp disk space | 
| Login always returns `User not found` | Cognito user not added to local JSON store (confirmation pending) | Verify confirmation flow and JSON files under `server/data/` | 
| Streaming returns `Transcoded file not yet available` | 720p variant pending/failed | Inspect DynamoDB status and server logs for ffmpeg errors | 
| Local dev hits SQLite errors | `USE_DYNAMO` unset leading to deprecated adapter | Export `USE_DYNAMO=true` in environment | 

## 15. Appendix
- **Scripts**: `npm run setup` initialises dependencies and (legacy) SQLite schema but will fail now that SQLite is deprecated; rely on DynamoDB provisioning instead.【F:package.json†L11-L18】【F:server/src/db.js†L1-L15】
- **Ports**: Backend defaults to 8080, frontend 3000. CORS allows origins configured via Parameter Store or `CLIENT_ORIGINS` env var.【F:server/src/config.js†L18-L46】【F:client/vite.config.js†L1-L11】
- **Default Domain**: Hardcoded defaults target `n11817143-videoapp.cab432.com`; adjust Parameter Store and `.env` values for other domains.【F:server/src/config.js†L18-L46】【F:client/src/api.js†L1-L101】

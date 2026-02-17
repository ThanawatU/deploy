# Changelog

All notable changes to this project will be documented in this file.

---

## [1.0.0] - 2026-02-13 - Wisit_2348

### Added

- Added .env file for Docker Compose configuration

- Updated .gitignore to exclude .env files

- Added `CORS_ORIGIN` environment variable

- Added CHANGE-LOG.md , AI-Declaration.md

### Changed

- Removed unnecessary build tools (python3, make, g++)

- Ensured Prisma works with openssl on Alpine

- Database migrations run automatically before server start

- Moved to build-time configuration using ARG

### Removed

- Duplicate Nuxt plugin file (fixes "Cannot redefine property $api" error)

- Removed `migrate` service (migrations now run automatically in backend)

---

## [1.0.0] - 2026-02-15 - ThanawatU

### Added

- Added `AuditLog` model to schema.prisma
- Completed Blacklist API
- Added Postman's Blacklist collection to test folder

### Changed

- Modify auth.controller.js to audit users Login and Password change activity
- Fixed Auditlog bug between User table and Auditlog table
- Fixed Directory conflict for prisma

---

## [1.0.0] - 2026-02-15 - Phakorn_2160

### Added

- System Logging Infrastructure for performance monitoring and issue tracking
  - `SystemLog` model in `prisma/schema.prisma` with fields: level, requestId, method, path, statusCode, duration, userId, ipAddress, userAgent, error (JSON), metadata (JSON)
  - `LogLevel` enum (INFO, WARN, ERROR) for categorizing log severity
  - Indexed fields for efficient querying: level, requestId, statusCode, createdAt, userId
- `src/utils/logger.js` - Lightweight structured JSON logger with configurable console output via `LOG_TO_CONSOLE` env var
- `src/services/systemLog.service.js` - Fire-and-forget database logging service (non-blocking)
- `src/middlewares/requestLogger.js` - HTTP request/response logging middleware

- Request Tracing - Every API request receives unique `X-Request-ID` header for debugging

### Changed

- `server.js` - Added `requestLogger` middleware after `metricsMiddleware`
- `src/middlewares/errorHandler.js` - Integrated error logging with full stack trace capture
- `.env.example` - Added `LOG_TO_CONSOLE` configuration variable

### Miscellaneous

- Log Levels automatically determined by status code (INFO: 2xx, WARN: 4xx, ERROR: 5xx)
- Excluded Paths `/health`, `/metrics`, `/documentation` skipped to reduce noise
- Non-blocking Database writes use fire-and-forget pattern to avoid impacting request latency
- Graceful Failure DB write failures log to console but never crash the application
- Post-Deployment run migration to create SystemLog table:
  ```bash
  docker compose exec backend npx prisma migrate dev --name add_system_log
  ```

---

## [1.0.0] - 2026-02-16 - Wisit_2348

### Changed

- Added `AccessLog` model structure to align with the latest authentication and session tracking requirements.
- Adjusted `expiresAt` field behavior in `AuditLog` to ensure proper log retention and expiration handling.
- Fixed and updated database migrations to correctly reflect the current Prisma schema.

---

## [1.0.0] - 2026-02-16 - Wisit_2348

### Added

- Created utility modules for accessLog and auditLog.

### Changed

- Updated migration files to align with the auditLog schema (log retention not implemented yet).
- Added audit log recording in the following controllers:auth.controller blacklist.controller booking.controller driverVerification.controller router.controller user.controller vehicle.controller
- Added const createdAt = new Date(); in audit.service.

### Removed

- Removed expiration date fields from auditLog, accessLog, and all related components.

### Fixed

- Bug fixes in requestLogger.js ,systemLog.service to connect database and backend

---

## [1.0.0] - 2026-02-16 - Phakorn_2160

### Added

- `src/services/blacklist.service.js` - Blacklist checking service with `checkBlacklistByIdentifiers()` and `checkBlacklistByUserId()` functions

### Changed

- `src/services/user.service.js` - Registration now checks if email, nationalIdNumber, or phoneNumber belongs to a blacklisted user before allowing account creation (returns 403 if blacklisted)

---

## [1.0.0] - 2026-02-17 - Nattaphat_0126

### Added

- **Log Retention System**:
  - `src/services/logRetention.service.js` - Added `cleanupOldLogs` function to automatically delete SystemLog and AccessLog entries older than 90 days.
- **Automated Testing (Robot Framework)**:
  - `test/blacklist_test.robot` - Added test suite for **Blacklist Lifecycle** (Create -> Get All/By ID -> Lift -> Add Evidence) to verify admin operations.
  - `test/auditlog_test.robot` - Added **Data Integrity Verification** test to ensure `AuditLog` correctly records userId, role, action, and request context (IP/UserAgent) upon Admin Login.
  - `test/audit_log_test.robot` - Added comprehensive audit log test suite covering:
    - Driver & Passenger Login.
    - Vehicle Creation (Driver) with amenities validation.
    - Route Creation & Booking Flow (Driver creates route -> Passenger books).

### Changed

- **Backend Server**:
  - `server.js` - Integrated `node-cron` to schedule the **Log Retention** task to run daily at 03:00 AM (GMT+7).
  - `package.json` - Added `node-cron` dependency to support scheduled tasks.

---

## [1.0.0] - 2026-02-17 - Pimapsorn_5095

### Added

- Created utility modules for accessLog and auditLog handling.
- Implemented getLatestAccessLogs in monitor.service to support LOGIN/LOGOUT display.
- Created Monitor Dashboard page to display: system logs,Audit logs,Access logs (LOGIN / LOGOUT)
    Real-time summary (total requests, errors in last 5 minutes, average response time)
- Connected frontend Monitor Dashboard with backend /monitor/logs and /monitor/logs/summary APIs.
- Created User Manual documentation

### Changed
- Updated monitor.controller to support dynamic log type selection (SystemLog, AuditLog, AccessLog).
- Updated monitor.service to: Support date filtering, Normalize access log output,
    Standardize response fields for frontend usage
- Improved AccessLog UI to visually distinguish

## Fixed
- Fixed database connection issue in requestLogger.js.
- Fixed AccessLog not updating logout time correctly.
- Fixed Monitor Dashboard log filtering by selected date.

---

## [1.0.0] - 2026-02-17 - Yodsanon_0215

### Added
- Added API base URL sanitization in the frontend to prevent duplicated paths (`//`) when calling backend endpoints.
- Recreated Prisma migrations and initialized a clean database migration structure.

### Fixed
- Fixed duplicated Prisma migrations and database schema mismatch issues.
- Resolved `P2022` error caused by missing `AuditLog.expiresAt` column in the database.

---

## [1.0.0] - 2026-02-17 - Yodsanon_0215

### Added
- Added UAT scenarios for Audit Log and Blacklist management.
- Implemented automated API tests using Robot Framework for AuditLog, AccessLog, SystemLog, and Blacklist workflow.

---

## [1.0.0] - 2026-02-17 - Kanyapat_5037

### Added
- Created Blacklist Management page
- Added log retention deletion function
- Implemented Robot Framework automated test cases for Log Retention feature
- Added Privacy Policy updates for Log Retention and Blacklist compliance

### Fixed
- Resolved 404 error on route `/blacklists/:id/edit`
- Fixed Cloudinary upload error

---

## [1.0.0] - 2026-02-17 - Wisit_2348

### Added
- AI Declaration
- Sprint Backlog File
- Adapt Blueprint

---

## Version Guidelines

### Categories

- **Added**: New features

- **Changed**: Changes in existing functionality

- **Deprecated**: Soon-to-be removed features

- **Removed**: Removed features

- **Fixed**: Bug fixes

- **Security**: Security improvements

- **Miscellaneous**: Explain what's been done

---

## Links

---

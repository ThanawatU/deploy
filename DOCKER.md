# Docker Setup Guide

Quick start guide for running Pai Nam Nae with Docker naja.

## Prerequisites

- Docker 24+
- Docker Compose v2+

## Quick Start

### Getting Started

1. Create `.env` file in the same directory as `docker-compose.yml`
2. Copy values from `.env.example` and fill in required variables
3. Run with Docker Compose:
```bash
   docker compose up -d --build
```

## Services

| Service | Port | URL |
|---------|------|-----|
| Frontend | 3001 | http://localhost:3001 |
| Backend API | 3000 | http://localhost:3000 |
| API Docs | 3000 | http://localhost:3000/documentation |
| PostgreSQL | 5432 | localhost:5432 |

## Common Commands

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# Stop and remove volumes (this deletes database btw)
docker compose down -v

# Rebuild after code changes
docker compose build --no-cache
docker compose up -d

# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Run Prisma commands
docker compose exec backend npx prisma studio
docker compose exec backend npx prisma migrate dev

# Access database
docker compose exec postgres psql -U pnn_user -d pnn_db
```

## Development Mode

For development with hot-reload, use the override file:

```bash
# Create docker-compose.override.yml for dev overrides
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

## Troubleshooting

**Database connection refused:**
```bash
# Wait for postgres to be healthy
docker compose ps
# Should show postgres as "healthy"
```

**Migrations not applied:**
```bash
docker compose run --rm migrate
```

**Prisma client mismatch:**
```bash
docker compose exec backend npx prisma generate
docker compose restart backend
```

**Fresh start:**
```bash
docker compose down -v
docker compose up -d
docker compose run --rm migrate
```

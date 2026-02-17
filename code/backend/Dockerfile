# =============================================================================
# Backend Dockerfile
# - Express.js + Prisma + PostgreSQL
# =============================================================================

# =============================================================================
# Stage 1: Dependencies
# =============================================================================
FROM node:20-alpine AS deps

# Required for Prisma engine
RUN apk add --no-cache openssl

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev

# Generate Prisma Client
RUN npx prisma generate


# =============================================================================
# Stage 2: Production
# =============================================================================
FROM node:20-alpine AS production

# Required for Prisma at runtime
RUN apk add --no-cache openssl

WORKDIR /app

# Copy dependencies and Prisma files
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma

# Copy application source code
COPY . .

# Re-generate Prisma Client for correct runtime binary
RUN npx prisma generate

EXPOSE 3000

# Run database migrations, then start server
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]

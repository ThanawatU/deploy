# =============================================================================
# Stage 1: Build
# =============================================================================
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

# Build-time public config (embedded into client bundle)
ARG NUXT_PUBLIC_API_BASE=http://localhost:3000/api/
ARG NUXT_PUBLIC_GOOGLE_MAPS_API_KEY=

ENV NUXT_PUBLIC_API_BASE=$NUXT_PUBLIC_API_BASE
ENV NUXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NUXT_PUBLIC_GOOGLE_MAPS_API_KEY

# Build Nuxt app
RUN npm run build


# =============================================================================
# Stage 2: Production
# =============================================================================
FROM node:20-alpine AS production

WORKDIR /app

# Copy built output only
COPY --from=build /app/.output ./.output

# Expose Nuxt server port
EXPOSE 3001

ENV HOST=0.0.0.0
ENV PORT=3001
ENV NITRO_PORT=3001

# Start Nuxt (Nitro) server
CMD ["node", ".output/server/index.mjs"]

# FeralLobster Digital Life Runtime
# Multi-stage build for minimal image size

# Stage 1: Build
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    gnupg

WORKDIR /build

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Stage 2: Runtime
FROM node:20-alpine

# Install runtime dependencies
RUN apk add --no-cache \
    gnupg \
    curl \
    ca-certificates

# Create non-root user
RUN addgroup -g 1001 -S feral && \
    adduser -S feral -u 1001

WORKDIR /app

# Copy built files
COPY --from=builder /build/dist ./dist
COPY --from=builder /build/node_modules ./node_modules
COPY --from=builder /build/package*.json ./

# Create memory directory
RUN mkdir -p /app/memory && chown -R feral:feral /app

# Switch to non-root user
USER feral

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "console.log('Health check OK')" || exit 1

# Default: Start survival loop
CMD ["node", "dist/core/survival/X402Survival.js"]

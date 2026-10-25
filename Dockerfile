# ==============================================================================
# Production Dockerfile for Library Management System
# Multi-stage optimized build for minimal image size & enhanced security
# ==============================================================================

# ----------------- Stage 1: Build & Dependencies -----------------
FROM node:22-alpine AS dependencies

WORKDIR /usr/src/app

# Install dependencies needed for native modules (if any)
RUN apk add --no-cache libc6-compat

# Leverage Docker cache layer for package manifests
COPY package.json ./

# Install only production dependencies
RUN npm install --omit=dev --ignore-scripts && npm cache clean --force

# ----------------- Stage 2: Final Production Runtime -----------------
FROM node:22-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    DATA_DIR=/usr/src/app/data_storage

# Create data directory and assign ownership to non-root node user
RUN mkdir -p /usr/src/app/data_storage && chown -R node:node /usr/src/app

# Copy production node_modules from dependencies stage
COPY --chown=node:node --from=dependencies /usr/src/app/node_modules ./node_modules

# Copy application source code
COPY --chown=node:node package.json ./
COPY --chown=node:node src ./src
COPY --chown=node:node public ./public

# Switch to non-root user for security isolation
USER node

# Expose the application port
EXPOSE 3000

# Automated Docker Health Check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/health || exit 1

# Start the application
CMD ["node", "src/server.js"]

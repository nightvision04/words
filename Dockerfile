# Base stage with Debian-based Node.js
FROM node:lts-slim AS base

# Create app directory
WORKDIR /app

# Dependencies stage
FROM base AS deps
# Copy package files
COPY package.json package-lock.json ./
# Install production dependencies
RUN npm install --production

# Builder stage to build the source
FROM base AS builder
WORKDIR /app
# Copy installed dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Set environment variable to disable Next.js telemetry
ENV NEXT_TELEMETRY_DISABLED 1
# Build the project
RUN npm run build

# Runner stage
FROM base AS runner
WORKDIR /app
# Set Node environment to production
ENV NODE_ENV production
# Create a group and user for running the application
RUN groupadd --gid 1001 nodejs \
    && useradd --gid nodejs --uid 1001 --system nextjs
# Install curl for health checks
RUN apt-get update && apt-get install -y curl
# Copy built files from builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/postcss.config.mjs ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src

# Ensure directory for SQLite database exists and is accessible
RUN mkdir -p /app && chown -R nextjs:nodejs /app

# Install ts-node in the runner stage
RUN npm install ts-node

# Switch to nextjs user before running scripts
USER nextjs

# Run the createPlayersTable script
RUN npx ts-node ./src/scripts/createTables.js

# Expose the port Next.js will run on
EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Health check to make sure the container is ready to handle requests
HEALTHCHECK CMD curl --fail http://localhost:3000 || exit 1

# Start the Next.js application using Next.js's built-in server
CMD ["./node_modules/.bin/next", "start"]

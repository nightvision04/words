# Use a smaller Node.js base image
FROM node:lts-alpine AS base

# Dependencies stage
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Install dependencies
RUN npm install --production

# Builder stage to rebuild the source
FROM base AS builder
WORKDIR /app
# Copy installed dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Disable Next.js telemetry for the build
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Runner stage
FROM node:lts-slim AS runner
WORKDIR /app
ENV NODE_ENV production
# Create a group and user for running the application
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
RUN apt-get update && apt-get install -y curl
# Prepare directory structures and permissions
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/postcss.config.mjs ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src

# Install ts-node in the runner stage
RUN npm install ts-node

# Run the createPlayerTable script as the nextjs user
USER nextjs
RUN npx ts-node ./src/scripts/createTables.ts

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"
# Health check to make sure the container is ready to handle requests
HEALTHCHECK CMD curl --fail http://localhost:3000 || exit 1
# Start the Next.js application using Next.js's built-in server
CMD ["./node_modules/.bin/next", "start"]
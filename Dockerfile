# OpenInterviewer Docker Image
# Multi-stage build: bun install → next build → minimal runner

FROM oven/bun:1-alpine AS builder
WORKDIR /app

COPY package.json bun.lock ./

# Install all deps including devDependencies (needed for next build)
RUN bun install --frozen-lockfile

COPY . .

RUN bun run build

# Runner stage — production only
FROM oven/bun:1-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package.json /app/bun.lock ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/next.config.* ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["bun", "run", "start"]
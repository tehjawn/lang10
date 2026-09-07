# syntax=docker/dockerfile:1

FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
ENV NEXT_TELEMETRY_DISABLED=1
# The Prisma schema and config are copied before `npm ci` because the
# postinstall hook runs `prisma generate` and needs them. It succeeds without
# DATABASE_URL — see prisma.config.ts.
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# The whole tree is carried over so the Prisma CLI is on hand to run migrations
# at boot. Trimming to production dependencies is a later optimisation.
COPY --from=builder /app ./
RUN chmod +x ./scripts/start.sh
EXPOSE 3000
CMD ["./scripts/start.sh"]

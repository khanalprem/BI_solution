# syntax=docker/dockerfile:1
# Production build for Next.js 15 frontend.
# NEXT_PUBLIC_* vars are baked at build time; pass them via --build-arg.

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV TZ=Asia/Kathmandu

RUN addgroup -S nextjs && adduser -S nextjs -G nextjs

COPY --from=builder --chown=nextjs:nextjs /app/.next ./.next
COPY --from=builder --chown=nextjs:nextjs /app/public ./public
COPY --from=builder --chown=nextjs:nextjs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nextjs /app/package-lock.json ./package-lock.json
COPY --from=builder --chown=nextjs:nextjs /app/next.config.js ./next.config.js
COPY --from=builder --chown=nextjs:nextjs /app/node_modules ./node_modules

USER nextjs
EXPOSE 3000
CMD ["npm", "start"]

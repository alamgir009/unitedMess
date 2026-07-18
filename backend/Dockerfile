FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production --ignore-scripts

FROM node:20-alpine

RUN apk add --no-cache tini

WORKDIR /app

RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup

COPY --chown=appuser:appgroup --from=builder /app/node_modules ./node_modules
COPY --chown=appuser:appgroup . .

USER appuser

EXPOSE 8080

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/server.js"]

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# Ensure dev dependencies are installed for the build stage (TSC needs them)
RUN npm install --include=dev

COPY . .

RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:20-alpine

# Install curl for healthcheck
RUN apk add --no-cache curl

WORKDIR /app


COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY start.sh ./start.sh
RUN chmod +x ./start.sh

EXPOSE 3001

CMD ["./start.sh"]

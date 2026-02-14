# Debian-based image (glibc) -> compatible Prisma engines
FROM node:20-bookworm-slim

WORKDIR /app

# Required libs for Prisma + SSL
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["sh", "-c", "npm run prisma:migrate && npm run start"]

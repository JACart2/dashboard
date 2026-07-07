# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        curl \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*


FROM base AS server-dev

WORKDIR /workspace/dashboard

COPY package.json package-lock.json ./

RUN npm ci

CMD ["npm", "run", "dev"]


FROM base AS ui-dev

WORKDIR /workspace/dashboard/ui

COPY ui/package.json ui/package-lock.json ./

RUN npm ci

CMD [
  "npm",
  "run",
  "dev",
  "--",
  "--host",
  "0.0.0.0",
  "--port",
  "5174"
]
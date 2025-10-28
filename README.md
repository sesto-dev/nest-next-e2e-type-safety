# NestJS + Next.js End-to-End Type-Safe API Setup

## Table of Contents

- [NestJS + Next.js End-to-End Type-Safe API Setup](#nestjs--nextjs-end-to-end-type-safe-api-setup)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Features](#features)
  - [Architecture](#architecture)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Configuration](#configuration)
    - [Environment Variables](#environment-variables)
    - [Docker Compose Services](#docker-compose-services)
    - [Volumes](#volumes)
  - [Usage](#usage)
    - [1. Access the Application](#1-access-the-application)
    - [2. Manage Services](#2-manage-services)
    - [3. Database Management](#3-database-management)
  - [OpenAPI Client Generation](#openapi-client-generation)
  - [Logging](#logging)
  - [Troubleshooting](#troubleshooting)
  - [Contributing](#contributing)

---

## Overview

This project provides a **full-stack, type-safe web application** built with **NestJS** and **Next.js**.

The backend uses **NestJS + Zod** to define and validate schemas, automatically generating an **OpenAPI specification** via `@nestjs/swagger` and `nestjs-zod`.
The frontend then consumes this OpenAPI JSON using **@hey-api/openapi-ts** to generate a **fully typed TypeScript client**.

With this setup:

- Zod schemas define the contract once.
- NestJS enforces validation, generates Swagger docs, and exposes OpenAPI.
- Next.js consumes it safely via an auto-generated, typed client.
- Docker Compose orchestrates everything: NestJS, Next.js, PostgreSQL, Redis, and Traefik.

---

## Features

- **End-to-End Type Safety:** Zod → DTO → OpenAPI → TypeScript client.
- **Runtime Validation + Compile-Time Typing:** Guaranteed schema alignment.
- **Auto-Generated API Client:** Powered by `@hey-api/openapi-ts`.
- **Cookie-Based Auth:** Secure HTTP-only cookies for tokens.
- **Full Docker Support:** Run all services with a single command.
- **Traefik Reverse Proxy:** HTTPS routing and certificate management.
- **Live Swagger Docs:** Auto-generated `/api/docs` endpoint.
- **Developer Scripts:** Simplified OpenAPI and client generation flows.

---

## Architecture

```
                   ┌───────────────────────────┐
                   │         Traefik           │
                   │  HTTPS + Reverse Proxy    │
                   └──────────┬────────────────┘
                              │
      ┌───────────────────────┼───────────────────────┐
      │                       │                       │
┌───────────────┐     ┌────────────────┐      ┌──────────────────┐
│   Next.js     │     │     NestJS     │      │   PostgreSQL     │
│ (Frontend)    │     │ (Backend API)  │      │ (Data Storage)   │
│ @hey-api      │<--->│ nestjs-zod +   │      │                  │
│ openapi-ts    │     │ swagger module │      │                  │
└───────────────┘     └────────────────┘      └──────────────────┘
                              │
                       ┌──────────────┐
                       │    Redis     │
                       │ (Cache/Auth) │
                       └──────────────┘
```

---

## Prerequisites

- **Docker:** [Install Docker](https://docs.docker.com/get-docker/)
- **Docker Compose:** [Install Docker Compose](https://docs.docker.com/compose/install/)
- **Domain Name:** For HTTPS via Traefik.
- **Node.js + pnpm:** For local Next.js or NestJS development.

---

## Installation

1. **Clone the Repository**

   ```bash
   git clone https://github.com/yourusername/nest-next-type-safe-api.git
   cd nest-next-type-safe-api
   ```

2. **Create Environment File**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your values (see [Environment Variables](#environment-variables)).

3. **Create Traefik Network**

   ```bash
   docker network create traefik-public
   ```

4. **Build and Start the Stack**

   ```bash
   docker compose -f docker-compose.yml -f docker-compose-traefik.yml up --build
   ```

---

## Configuration

### Environment Variables

| Variable         | Description                               | Example                              |
| ---------------- | ----------------------------------------- | ------------------------------------ |
| **ROOT_DOMAIN**  | Base domain used for backend and frontend | `example.com`                        |
| **NEXT_DOMAIN**  | Domain for the Next.js app                | `app.example.com`                    |
| **JWT_SECRET**   | JWT signing key                           | `supersecretkey`                     |
| **DATABASE_URL** | PostgreSQL connection string              | `postgresql://user:pass@db:5432/app` |
| **REDIS_URL**    | Redis connection URL                      | `redis://redis:6379`                 |
| **CORS_ORIGIN**  | Allowed origin for frontend requests      | `https://app.example.com`            |
| **ACME_EMAIL**   | Let's Encrypt certificate contact email   | `admin@example.com`                  |

### Docker Compose Services

| Service      | Description                                       |
| ------------ | ------------------------------------------------- |
| **traefik**  | Reverse proxy, SSL termination, auto certificates |
| **nest**     | NestJS backend (Zod + Swagger + OpenAPI)          |
| **next**     | Next.js frontend (typed client)                   |
| **postgres** | PostgreSQL database                               |
| **redis**    | Cache/session store                               |

### Volumes

| Volume                        | Purpose                    |
| ----------------------------- | -------------------------- |
| `./nest:/app`                 | NestJS source code         |
| `./next:/app`                 | Next.js source code        |
| `./postgres_data`             | PostgreSQL persistent data |
| `traefik-public-certificates` | Let's Encrypt certificates |

---

## Usage

### 1. Access the Application

- **Frontend:**
  `https://app.example.com`

- **Backend API Root:**
  `https://example.com/api`

- **Swagger UI:**
  `https://example.com/api/docs`

### 2. Manage Services

```bash
# Start
docker compose up -d

# Stop
docker compose down

# Logs
docker compose logs -f
```

### 3. Database Management

```bash
docker compose exec nest pnpm prisma migrate deploy
docker compose exec nest pnpm prisma studio
```

---

## OpenAPI Client Generation

The **Next.js app** uses the OpenAPI JSON generated by NestJS to create a **fully typed TypeScript client**.

1. **Generate Schema (from NestJS)**

   ```bash
   docker compose exec nest pnpm openapi:export
   ```

   This runs the script in `scripts/openapi.ts`, which bootstraps NestJS and writes `openapi.json` to the Next.js directory.

2. **Generate TypeScript Client**

   Inside the `next/` folder:

   ```bash
   cd next
   pnpm openapi
   ```

   This executes:

   - `pnpm openapi:download` → pulls the latest `openapi.json` from the backend
   - `pnpm openapi:generate` → builds the TypeScript client with `@hey-api/openapi-ts`

3. **Use the Client in Next.js**

   ```ts
   import { apiTodosList, apiTodosCreate } from '@/client'

   const todos = await apiTodosList()
   const newTodo = await apiTodosCreate({ body: { title: 'Hello world' } })
   ```

---

## Logging

All services log to stdout. You can stream logs with:

```bash
docker compose logs -f nest
docker compose logs -f next
```

- **Backend:** Logs managed by NestJS’s built-in `Logger` (JSON or pretty-print mode).
- **Frontend:** Next.js logs during build and runtime.
- **Traefik:** Access and error logs for HTTPS routing.

---

## Troubleshooting

| Issue                         | Possible Cause          | Fix                                                 |
| ----------------------------- | ----------------------- | --------------------------------------------------- |
| **Traefik not accessible**    | Port 80/443 blocked     | Ensure ports 80 and 443 are open                    |
| **Frontend can’t reach API**  | CORS or cookie settings | Check `CORS_ORIGIN` and credentials settings        |
| **Schema not generating**     | Missing `nestjs-zod`    | Run `pnpm i @anatine/nestjs-zod @nestjs/swagger`    |
| **Client outdated**           | Backend changed         | Run `pnpm openapi` in `next/` directory             |
| **Database connection error** | DB not ready            | Re-run `docker compose up -d` after Postgres starts |

---

## Contributing

Contributions are welcome!
To add features or fix bugs:

```bash
git checkout -b feature/your-feature
git commit -m "Add your feature"
git push origin feature/your-feature
```

Then open a Pull Request with a clear explanation of the change.

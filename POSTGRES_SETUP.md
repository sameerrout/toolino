# Neon PostgreSQL Integration for Toolino

This guide outlines the persistent PostgreSQL database setup for visitor counting, authentication, and manager analytics on Vercel.

## Why Neon PostgreSQL?

On Vercel, serverless functions are stateless and memory/filesystem storage (`/tmp`) resets between requests and cold starts. Connecting a persistent Neon PostgreSQL database ensures that:
- Visitor statistics (total visits, unique visitors, today's visitors) permanently persist.
- Registered members and tool usages are cluster-synchronized.
- The manager dashboard displays `PostgreSQL Connected` instead of `Awaiting PostgreSQL`.

---

## Quick Setup Steps

### 1. Add Neon in Vercel
1. Go to your **Vercel Project Dashboard**.
2. Navigate to **Storage** (or **Marketplace**) and click **Create Database** -> **Neon** (Postgres).
3. Connect it to your project (`toolino`).
4. Vercel automatically exposes the required environment variables:
   - `DATABASE_URL` (Pooled connection string)
   - `DATABASE_URL_UNPOOLED` / `POSTGRES_URL_NON_POOLING` (Direct connection string)

### 2. Automatic Schema Migration
The project automatically runs migrations during every Vercel build (`npm run prebuild`) via `scripts/deploy-migrate.mjs` and runtime self-healing via `ensureDatabaseSchemaAsync()`.

The following tables are managed automatically:
- `page_visits`: Stores page visits, client hashes, masked IPs, referrers, and session cookies.
- `users`: Registered users and manager accounts.
- `tool_usages`: Aggregated tool usage counters.
- `activity_events`: Audit log events.
- `contact_messages`: Inquiries and contact submissions.

### 3. Tracking Endpoints
Two endpoints are available to record page views:
- `/api/analytics/visit` (Default client beacon endpoint)
- `/api/track` (Supports direct POST with `{ visitorId, page, referrer }`)

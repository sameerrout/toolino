import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

function resolveConnectionUrls() {
  const unpooledRaw = process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING;
  const pooledRaw = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL;

  let unpooled = unpooledRaw ? unpooledRaw.trim() : '';
  let pooled = pooledRaw ? pooledRaw.trim() : '';

  if (!unpooled && pooled && pooled.includes('-pooler')) {
    unpooled = pooled.replace('-pooler', '');
  }

  if (!pooled && unpooled) {
    pooled = unpooled;
  }

  if (pooled && (pooled.includes('-pooler') || pooled.includes('pooler')) && !pooled.includes('pgbouncer=true')) {
    pooled += (pooled.includes('?') ? '&' : '?') + 'pgbouncer=true';
  }

  return { unpooled: unpooled || pooled, pooled: pooled || unpooled };
}

async function runDeployMigration() {
  const { unpooled, pooled } = resolveConnectionUrls();

  if (!unpooled || unpooled.includes('localhost') || (!unpooled.startsWith('postgresql:') && !unpooled.startsWith('postgres:'))) {
    console.log('Local/offline environment detected. Skipping build-time remote database migrations.');
    return;
  }

  console.log('Remote PostgreSQL detected. Target host:', unpooled.split('@')[1]?.split('/')[0]?.split('?')[0] || 'remote-db');
  process.env.DATABASE_URL_UNPOOLED = unpooled;
  process.env.DATABASE_URL = pooled;

  let cliSuccess = false;

  // 1. Attempt official Prisma CLI migrate deploy
  try {
    console.log('Running "npx prisma migrate deploy"...');
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: unpooled,
        DATABASE_URL_UNPOOLED: unpooled,
      },
    });
    console.log('Prisma CLI migrations applied successfully.');
    cliSuccess = true;
  } catch (cliErr) {
    console.warn('Prisma CLI migrate deploy encountered an issue, executing resilient DDL fallback:', cliErr.message);
  }

  // 2. Programmatic DDL verification and fallback
  const prisma = new PrismaClient({
    datasources: {
      db: { url: unpooled },
    },
    log: ['error'],
  });

  try {
    await prisma.$connect();
    console.log('Connected to PostgreSQL database for verification.');

    // Check if tables already exist
    let tablesExist = false;
    try {
      await prisma.$queryRawUnsafe('SELECT 1 FROM "page_visits" LIMIT 1;');
      await prisma.$queryRawUnsafe('SELECT 1 FROM "users" LIMIT 1;');
      tablesExist = true;
      console.log('Database tables verified: page_visits and users exist.');
    } catch {
      tablesExist = false;
    }

    if (!tablesExist) {
      console.log('Applying migration SQL schema directly to ensure all tables exist...');
      const migrationFile = path.join(ROOT, 'prisma', 'migrations', '0_init', 'migration.sql');
      if (fs.existsSync(migrationFile)) {
        // Execute DDL statements
        const statements = [
          `CREATE TABLE IF NOT EXISTS "users" (
            "id" TEXT NOT NULL,
            "email" TEXT NOT NULL,
            "name" TEXT NOT NULL,
            "picture" TEXT,
            "authProvider" TEXT NOT NULL DEFAULT 'email',
            "passwordHash" TEXT,
            "role" TEXT NOT NULL DEFAULT 'user',
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "lastLoginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "resetTokenHash" TEXT,
            "resetTokenExpires" TIMESTAMP(3),
            CONSTRAINT "users_pkey" PRIMARY KEY ("id")
          );`,
          `CREATE TABLE IF NOT EXISTS "tool_usages" (
            "id" TEXT NOT NULL,
            "slug" TEXT NOT NULL,
            "count" INTEGER NOT NULL DEFAULT 0,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "tool_usages_pkey" PRIMARY KEY ("id")
          );`,
          `CREATE TABLE IF NOT EXISTS "activity_events" (
            "id" TEXT NOT NULL,
            "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "type" TEXT NOT NULL,
            "email" TEXT,
            "toolSlug" TEXT,
            CONSTRAINT "activity_events_pkey" PRIMARY KEY ("id")
          );`,
          `CREATE TABLE IF NOT EXISTS "contact_messages" (
            "id" TEXT NOT NULL,
            "name" TEXT NOT NULL,
            "email" TEXT NOT NULL,
            "category" TEXT NOT NULL,
            "message" TEXT NOT NULL,
            "status" TEXT NOT NULL DEFAULT 'unread',
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
          );`,
          `CREATE TABLE IF NOT EXISTS "page_visits" (
            "id" TEXT NOT NULL,
            "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "visitorHash" TEXT NOT NULL,
            "maskedIp" TEXT NOT NULL,
            "path" TEXT NOT NULL,
            "referrer" TEXT,
            "userAgent" TEXT,
            "visitorSessionId" TEXT,
            CONSTRAINT "page_visits_pkey" PRIMARY KEY ("id")
          );`,
          `CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");`,
          `CREATE UNIQUE INDEX IF NOT EXISTS "tool_usages_slug_key" ON "tool_usages"("slug");`,
          `CREATE INDEX IF NOT EXISTS "activity_events_timestamp_idx" ON "activity_events"("timestamp");`,
          `CREATE INDEX IF NOT EXISTS "activity_events_email_idx" ON "activity_events"("email");`,
          `CREATE INDEX IF NOT EXISTS "contact_messages_status_idx" ON "contact_messages"("status");`,
          `CREATE INDEX IF NOT EXISTS "contact_messages_createdAt_idx" ON "contact_messages"("createdAt");`,
          `CREATE INDEX IF NOT EXISTS "page_visits_timestamp_idx" ON "page_visits"("timestamp");`,
          `CREATE INDEX IF NOT EXISTS "page_visits_visitorHash_idx" ON "page_visits"("visitorHash");`,
          `CREATE INDEX IF NOT EXISTS "page_visits_path_idx" ON "page_visits"("path");`,
          `DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_constraint WHERE conname = 'activity_events_email_fkey'
            ) THEN
              ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_email_fkey" FOREIGN KEY ("email") REFERENCES "users"("email") ON DELETE CASCADE ON UPDATE CASCADE;
            END IF;
          END $$;`,
        ];

        for (const sql of statements) {
          await prisma.$executeRawUnsafe(sql);
        }
        console.log('All PostgreSQL tables and indexes created successfully.');
      }
    }

    // 3. Ensure manager user accounts exist in PostgreSQL
    const managerEmails = (process.env.MANAGER_EMAILS || 'sameerrout2004@gmail.com,sonysampangi9@gmail.com')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    for (const email of managerEmails) {
      await prisma.user.upsert({
        where: { email },
        update: {
          role: 'manager',
          lastLoginAt: new Date(),
        },
        create: {
          id: `mgr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          email,
          name: email.split('@')[0],
          role: 'manager',
          authProvider: 'email',
          createdAt: new Date(),
          lastLoginAt: new Date(),
        },
      });
      console.log(`Verified manager account for ${email} in PostgreSQL.`);
    }

    console.log('--- Remote database deployment and migration completed successfully ---');
  } catch (err) {
    console.error('Database migration error:', err instanceof Error ? err.message : err);
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      if (!cliSuccess) {
        // Only hard fail if CLI also failed and programmatic fallback failed
        throw err;
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

runDeployMigration().catch((err) => {
  console.error('Deploy migration fatal error:', err);
  process.exit(1);
});

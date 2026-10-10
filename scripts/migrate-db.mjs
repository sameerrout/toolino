/**
 * ToolForForever - Database Migration Script
 * Migrates data from local db.json to PostgreSQL (Amazon RDS or configured DATABASE_URL)
 *
 * Usage:
 *   DATABASE_URL="postgresql://user:pass@host:5432/toolino" node scripts/migrate-db.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DB_FILE = path.join(ROOT, '.data', 'db.json');

async function migrate() {
  console.log('--- ToolForForever Database Migration ---');

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL environment variable is not defined.');
    console.error('Please configure DATABASE_URL in your environment or .env.local.');
    process.exit(1);
  }

  if (!fs.existsSync(DB_FILE)) {
    console.log(`No db.json file found at ${DB_FILE}. Nothing to migrate.`);
    return;
  }

  // Safe automatic backup of source data files before migration
  const backupDir = path.join(ROOT, '.data', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  if (fs.existsSync(DB_FILE)) {
    fs.copyFileSync(DB_FILE, path.join(backupDir, `db.backup.${timestamp}.json`));
    console.log(`Created backup of db.json at .data/backups/db.backup.${timestamp}.json`);
  }
  const visitsFile = path.join(ROOT, '.data', 'visits.json');
  if (fs.existsSync(visitsFile)) {
    fs.copyFileSync(visitsFile, path.join(backupDir, `visits.backup.${timestamp}.json`));
    console.log(`Created backup of visits.json at .data/backups/visits.backup.${timestamp}.json`);
  }

  let dbData;
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    dbData = JSON.parse(raw);
  } catch (err) {
    console.error(`ERROR: Failed to read db.json at ${DB_FILE}:`, err);
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    await prisma.$connect();
    console.log('Connected to PostgreSQL successfully.');

    // 1. Migrate Users
    const users = dbData.users || [];
    console.log(`Found ${users.length} users in db.json.`);
    let userSuccessCount = 0;

    for (const u of users) {
      if (!u.email) continue;
      const normalizedEmail = u.email.trim().toLowerCase();
      
      // Hash resetToken if it was stored raw
      let resetTokenHash = null;
      if (u.resetToken) {
        resetTokenHash = crypto.createHash('sha256').update(u.resetToken).digest('hex');
      }

      await prisma.user.upsert({
        where: { email: normalizedEmail },
        update: {
          name: u.name || normalizedEmail.split('@')[0],
          picture: u.picture || null,
          authProvider: u.authProvider || 'email',
          passwordHash: u.passwordHash || null,
          role: u.role || 'user',
          lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt) : new Date(),
          resetTokenHash,
          resetTokenExpires: u.resetTokenExpires ? new Date(u.resetTokenExpires) : null,
        },
        create: {
          id: u.id || `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
          email: normalizedEmail,
          name: u.name || normalizedEmail.split('@')[0],
          picture: u.picture || null,
          authProvider: u.authProvider || 'email',
          passwordHash: u.passwordHash || null,
          role: u.role || 'user',
          createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
          lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt) : new Date(),
          resetTokenHash,
          resetTokenExpires: u.resetTokenExpires ? new Date(u.resetTokenExpires) : null,
        },
      });
      userSuccessCount++;
    }
    console.log(`Successfully migrated/upserted ${userSuccessCount} users.`);

    // 2. Migrate Tool Usage
    const toolUsage = dbData.toolUsage || {};
    const toolEntries = Object.entries(toolUsage);
    console.log(`Found ${toolEntries.length} tool usage entries.`);
    let toolSuccessCount = 0;

    for (const [slug, count] of toolEntries) {
      await prisma.toolUsage.upsert({
        where: { slug },
        update: {
          count: count,
        },
        create: {
          slug,
          count,
        },
      });
      toolSuccessCount++;
    }
    console.log(`Successfully migrated ${toolSuccessCount} tool usage records.`);

    // 3. Migrate Contact Messages
    const contactMessages = dbData.contactMessages || [];
    console.log(`Found ${contactMessages.length} contact messages.`);
    let contactSuccessCount = 0;

    for (const m of contactMessages) {
      if (!m.id) continue;
      await prisma.contactMessage.upsert({
        where: { id: m.id },
        update: {
          name: m.name,
          email: m.email,
          category: m.category,
          message: m.message,
          status: m.status || 'unread',
          updatedAt: m.updatedAt ? new Date(m.updatedAt) : new Date(),
        },
        create: {
          id: m.id,
          name: m.name,
          email: m.email,
          category: m.category,
          message: m.message,
          status: m.status || 'unread',
          createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
          updatedAt: m.updatedAt ? new Date(m.updatedAt) : new Date(),
        },
      });
      contactSuccessCount++;
    }
    console.log(`Successfully migrated ${contactSuccessCount} contact messages.`);

    // 4. Migrate Activity Events
    const events = dbData.events || [];
    console.log(`Found ${events.length} activity events.`);
    let eventSuccessCount = 0;

    for (const event of events) {
      const eventId = event.id || `evt_${crypto.createHash('sha256').update(`${event.timestamp}_${event.type}_${event.email}_${event.toolSlug}`).digest('hex').slice(0, 20)}`;
      const userExists = event.email ? await prisma.user.findUnique({ where: { email: event.email.toLowerCase() } }) : null;

      await prisma.activityEvent.upsert({
        where: { id: eventId },
        update: {},
        create: {
          id: eventId,
          timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
          type: event.type || 'tool_use',
          email: event.email ? event.email.toLowerCase() : null,
          toolSlug: event.toolSlug || null,
          user: userExists ? { connect: { email: userExists.email } } : undefined,
        },
      });
      eventSuccessCount++;
    }
    console.log(`Successfully imported ${eventSuccessCount} activity events.`);

    // 5. Migrate Page Visits
    const visitsFile = path.join(ROOT, '.data', 'visits.json');
    let visits = [];
    if (fs.existsSync(visitsFile)) {
      try {
        visits = JSON.parse(fs.readFileSync(visitsFile, 'utf-8'));
      } catch {
        visits = [];
      }
    }
    if (!Array.isArray(visits) || visits.length === 0) {
      visits = dbData.visits || [];
    }
    console.log(`Found ${visits.length} page visits.`);
    let visitSuccessCount = 0;

    for (const v of visits) {
      if (!v.path) continue;
      const visitId = v.id || `vis_${crypto.createHash('sha256').update(`${v.timestamp}_${v.path}_${v.visitorHash}`).digest('hex').slice(0, 20)}`;
      await prisma.pageVisit.upsert({
        where: { id: visitId },
        update: {},
        create: {
          id: visitId,
          timestamp: v.timestamp ? new Date(v.timestamp) : new Date(),
          visitorHash: v.visitorHash || 'unknown',
          maskedIp: v.maskedIp || 'unknown',
          path: v.path,
          referrer: v.referrer || null,
          userAgent: v.userAgent || null,
          visitorSessionId: v.visitorSessionId || null,
        },
      });
      visitSuccessCount++;
    }
    console.log(`Successfully imported ${visitSuccessCount} page visits.`);

    console.log('--- Migration Completed Successfully ---');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();

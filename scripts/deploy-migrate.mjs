import { execSync } from 'node:child_process';

const dbUrl = process.env.DATABASE_URL;

if (dbUrl && !dbUrl.includes('localhost') && (dbUrl.startsWith('postgresql:') || dbUrl.startsWith('postgres:'))) {
  console.log('Remote DATABASE_URL detected. Applying Prisma database migrations...');
  try {
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    console.log('Prisma migrations deployed successfully.');
  } catch (err) {
    console.error('Error deploying Prisma migrations:', err.message);
    if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_LOCAL_STORAGE_IN_PROD) {
      process.exit(1);
    }
  }
} else {
  console.log('Local/offline environment detected. Skipping build-time remote database migrations.');
}

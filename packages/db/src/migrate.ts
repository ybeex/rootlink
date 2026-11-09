import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATABASE_URL = process.env['DATABASE_URL'];
if (!DATABASE_URL) throw new Error('DATABASE_URL is required');
const databaseUrl: string = DATABASE_URL;

async function runMigrations() {
  console.log('Running database migrations...');

  const sql = postgres(databaseUrl, { max: 1 });
  const db  = drizzle(sql);

  await migrate(db, {
    migrationsFolder: path.join(__dirname, '..', 'migrations'),
  });

  console.log('Migrations complete.');
  await sql.end();
  process.exit(0);
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

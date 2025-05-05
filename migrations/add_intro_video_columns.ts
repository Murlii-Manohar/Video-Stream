import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

async function runMigration() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL environment variable not set");
    process.exit(1);
  }

  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  const db = drizzle(sql);

  try {
    // Add new columns to site_settings table
    await sql`
      ALTER TABLE site_settings 
      ADD COLUMN IF NOT EXISTS intro_video_enabled BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS intro_video_url TEXT,
      ADD COLUMN IF NOT EXISTS intro_video_duration INTEGER;
    `;

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigration();
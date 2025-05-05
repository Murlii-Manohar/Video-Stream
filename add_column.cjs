const { Pool } = require('pg');
require('dotenv').config();

async function runMigration() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('DATABASE_URL environment variable not set');
    process.exit(1);
  }
  
  const pool = new Pool({
    connectionString,
  });
  
  try {
    console.log('Starting migration: Add adSkippable column to videos table');
    
    // Check if the column already exists before adding it to avoid duplicate column errors
    const checkColumnQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'videos' AND column_name = 'ad_skippable';
    `;
    
    const checkResult = await pool.query(checkColumnQuery);
    
    if (checkResult.rows.length === 0) {
      // Column doesn't exist, so add it
      const addColumnQuery = `
        ALTER TABLE videos 
        ADD COLUMN ad_skippable BOOLEAN DEFAULT true;
      `;
      
      await pool.query(addColumnQuery);
      console.log('Successfully added ad_skippable column to videos table');
    } else {
      console.log('Column ad_skippable already exists in videos table');
    }
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
runMigration().catch(console.error);
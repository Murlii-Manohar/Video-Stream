import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { 
  users, 
  channels, 
  videos, 
  comments, 
  subscriptions,
  likedVideos,
  videoHistory,
  siteSettings
} from './shared/schema';
import { createHash, randomBytes } from 'crypto';

// Connect to the database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema: { users, channels, videos, comments, subscriptions, likedVideos, videoHistory, siteSettings } });

async function setupDatabase() {
  console.log("Setting up database tables...");
  
  // Create admin user
  const email = 'm.manohar2003@gmail.com';
  const password = '@Manohar596';
  
  // Hash the password
  const salt = randomBytes(16).toString('hex');
  const hash = createHash('sha256');
  hash.update(password + salt);
  const hashedPassword = `${hash.digest('hex')}.${salt}`;
  
  try {
    // Try to find the admin user first
    const existingUsers = await db.select().from(users).where(eq(users.email, email));
    
    if (existingUsers.length === 0) {
      // Create admin user if not exists
      console.log("Creating admin user...");
      
      // Insert user with only required fields
      await db.insert(users).values({
        username: 'admin',
        email: email,
        password: hashedPassword,
        isAdmin: true,
      });
      
      console.log("Admin user created successfully");
    } else {
      console.log("Admin user already exists");
    }
    
    console.log("Database setup completed successfully");
  } catch (error) {
    console.error("Error setting up database:", error);
  } finally {
    await pool.end();
  }
}

setupDatabase().catch(console.error);
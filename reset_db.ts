import { DynamoDBStorage } from "./server/dynamoDBStorage";
import * as readline from 'readline';

// Make sure environment variables are available
import * as dotenv from 'dotenv';
dotenv.config();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function resetDB() {
  // Add timestamp to logs
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] === XPlayHD DATABASE RESET UTILITY ===`);
  console.log(`[${timestamp}] WARNING: This will delete and recreate all database tables!`);
  console.log(`[${timestamp}] AWS Region: ${process.env.AWS_REGION}`);
  console.log(`[${timestamp}] AWS Access Key ID (first 4 chars): ${process.env.AWS_ACCESS_KEY_ID?.substring(0, 4)}`);

  // Prompt user to confirm
  const answer = await new Promise<string>(resolve => {
    rl.question(`[${timestamp}] Are you sure you want to reset the database? This will delete all data! (yes/no): `, resolve);
  });

  if (answer.toLowerCase() !== 'yes') {
    console.log(`[${timestamp}] Database reset cancelled.`);
    return false;
  }
  
  console.log(`[${timestamp}] Initializing DynamoDB storage for reset...`);
  const storage = new DynamoDBStorage();
  
  console.log(`[${timestamp}] Beginning database reset...`);
  try {
    const result = await storage.resetDatabase();
    if (result) {
      console.log(`[${timestamp}] Database reset completed successfully!`);
    } else {
      console.log(`[${timestamp}] Database reset failed.`);
    }
    return result;
  } catch (error) {
    console.error(`[${timestamp}] Error during database reset:`, error);
    return false;
  }
}

resetDB().then(result => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Reset process finished with status: ${result ? 'SUCCESS' : 'FAILED'}`);
  rl.close();
  process.exit(result ? 0 : 1);
}).catch(err => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] Fatal error:`, err);
  rl.close();
  process.exit(1);
});
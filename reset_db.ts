import { DynamoDBStorage } from "./server/dynamoDBStorage";

// Make sure environment variables are available
import * as dotenv from 'dotenv';
dotenv.config();

async function resetDB() {
  console.log("Initializing DynamoDB storage for reset...");
  console.log("AWS Region:", process.env.AWS_REGION);
  console.log("AWS Access Key ID (first 4 chars):", process.env.AWS_ACCESS_KEY_ID?.substring(0, 4));
  const storage = new DynamoDBStorage();
  
  console.log("Beginning database reset...");
  try {
    const result = await storage.resetDatabase();
    if (result) {
      console.log("Database reset completed successfully!");
    } else {
      console.log("Database reset failed.");
    }
  } catch (error) {
    console.error("Error during database reset:", error);
  }
}

resetDB().then(() => {
  console.log("Reset process finished.");
  process.exit(0);
}).catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
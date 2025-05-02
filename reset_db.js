// ESM version of the database reset script
import { DynamoDBStorage } from "./server/dynamoDBStorage.js";

async function resetDB() {
  console.log("Initializing DynamoDB storage for reset...");
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
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

async function checkTable(tableName) {
  const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
    }
  });

  const docClient = DynamoDBDocumentClient.from(client);

  try {
    console.log(`Scanning table ${tableName}...`);
    const response = await docClient.send(
      new ScanCommand({
        TableName: tableName,
        Limit: 10
      })
    );
    
    if (response.Items && response.Items.length > 0) {
      console.log(`Found ${response.Items.length} items in ${tableName}`);
      console.log('First item:', JSON.stringify(response.Items[0]));
    } else {
      console.log(`No items found in ${tableName}`);
    }
  } catch (error) {
    console.error(`Error scanning table ${tableName}:`, error);
  }
}

// Check Users table
const tableName = process.argv[2] || 'XPlayHD_Users';
checkTable(tableName);

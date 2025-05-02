const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

async function main() {
  try {
    console.log('Initializing DynamoDB client...');
    const client = new DynamoDBClient({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });
    
    const docClient = DynamoDBDocumentClient.from(client);
    console.log('DynamoDB client initialized successfully');
    
    console.log('Scanning XPlayHD_Videos table...');
    const response = await docClient.send(
      new ScanCommand({
        TableName: 'XPlayHD_Videos',
        Limit: 100
      })
    );
    
    // Print the response
    console.log('Response:', JSON.stringify(response, null, 2));
    
    if (!response.Items || response.Items.length === 0) {
      console.log('No videos found in the table');
    } else {
      console.log(`Found ${response.Items.length} videos`);
      console.log('Sample video data:', JSON.stringify(response.Items[0], null, 2));
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

main();

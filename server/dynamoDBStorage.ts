import { 
  DynamoDBClient, 
  CreateTableCommand, 
  ListTablesCommand, 
  DescribeTableCommand,
  DeleteTableCommand
} from "@aws-sdk/client-dynamodb";
import { 
  DynamoDBDocumentClient, 
  GetCommand, 
  PutCommand, 
  QueryCommand, 
  ScanCommand, 
  UpdateCommand,
  DeleteCommand
} from "@aws-sdk/lib-dynamodb";
import { 
  User, InsertUser, 
  Channel, InsertChannel, 
  Video, InsertVideo, 
  Comment, InsertComment, 
  Subscription, InsertSubscription, 
  LikedVideo, InsertLikedVideo, 
  VideoHistory, InsertVideoHistory,
  SiteSettings
} from "@shared/schema";
import { IStorage } from "./storage";
import * as crypto from "crypto";

// DynamoDB Table Names
const TABLES = {
  USERS: "XPlayHD_Users",
  CHANNELS: "XPlayHD_Channels",
  VIDEOS: "XPlayHD_Videos",
  COMMENTS: "XPlayHD_Comments",
  SUBSCRIPTIONS: "XPlayHD_Subscriptions",
  LIKED_VIDEOS: "XPlayHD_LikedVideos",
  VIDEO_HISTORY: "XPlayHD_VideoHistory",
  SITE_SETTINGS: "XPlayHD_SiteSettings"
};

export class DynamoDBStorage implements IStorage {
  private defaultSiteSettings: SiteSettings = {
    id: 1,
    siteAdsEnabled: false,
    siteAdUrls: [],
    siteAdPositions: [],
    updatedAt: new Date().toISOString()
  };
  private client: DynamoDBClient;
  private docClient: DynamoDBDocumentClient;
  private initialized: boolean = false;

  constructor() {
    // Initialize DynamoDB client
    this.client = new DynamoDBClient({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ""
      }
    });

    // Create document client
    this.docClient = DynamoDBDocumentClient.from(this.client);
  }

  // Method to delete a table with timeout
  private async deleteTable(tableName: string): Promise<boolean> {
    try {
      console.log(`Attempting to delete table ${tableName}...`);
      
      const deletePromise = Promise.race([
        this.client.send(new DeleteTableCommand({ TableName: tableName })),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Delete table operation for ${tableName} timed out after 3 seconds`)), 3000)
        )
      ]);
      
      await deletePromise;
      console.log(`Table ${tableName} deleted successfully`);
      return true;
    } catch (error) {
      if (error.name === 'ResourceNotFoundException') {
        console.log(`Table ${tableName} does not exist, no need to delete`);
        return true;
      }
      console.error(`Failed to delete table ${tableName}:`, error);
      return false;
    }
  }

  // Reset and initialize the database from scratch
  public async resetDatabase(): Promise<boolean> {
    try {
      console.log("====== STARTING COMPLETE DATABASE RESET ======");
      
      // Get all table names
      const allTables = Object.values(TABLES);
      
      // Delete all tables
      for (const tableName of allTables) {
        await this.deleteTable(tableName);
      }
      
      // Wait a moment for AWS to process the deletions
      console.log("Waiting for AWS to process table deletions...");
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Now create all tables from scratch
      for (const tableName of allTables) {
        try {
          console.log(`Creating new table ${tableName} with proper schema`);
          await this.createTable(tableName);
          
          // Wait a bit between table creations to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Error creating table ${tableName}:`, error);
        }
      }
      
      console.log("====== DATABASE RESET COMPLETE ======");
      return true;
    } catch (error) {
      console.error("Database reset failed:", error);
      return false;
    }
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // First try to completely reset the database to ensure proper indexes
      await this.resetDatabase();
      
      // Get all table names
      const allTables = Object.values(TABLES);
      
      // Verify all tables exist
      const { TableNames } = await this.client.send(new ListTablesCommand({}));
      console.log("Current DynamoDB tables:", TableNames);
      
      // Check if any tables are missing
      const missingTables = allTables.filter(table => !TableNames?.includes(table));
      if (missingTables.length > 0) {
        console.log(`Still missing tables: ${missingTables.join(', ')}`);
        
        // Try to create missing tables
        for (const tableName of missingTables) {
          try {
            console.log(`Creating missing table ${tableName}`);
            await this.createTable(tableName);
          } catch (error) {
            console.error(`Error creating table ${tableName}:`, error);
          }
        }
      }

      this.initialized = true;
      console.log("DynamoDB Storage initialized successfully");
    } catch (error) {
      console.error("Failed to initialize DynamoDB Storage:", error);
      throw error;
    }
  }

  private async createTable(tableName: string): Promise<void> {
    const tableParams = this.getTableParams(tableName);
    
    try {
      // Create table with timeout to avoid hanging
      const createTablePromise = Promise.race([
        this.client.send(new CreateTableCommand(tableParams)),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Create table operation for ${tableName} timed out after 3 seconds`)), 3000)
        )
      ]);
    
      await createTablePromise;
      console.log(`Table ${tableName} created successfully`);
      
      // Don't wait for table to be active - this will happen asynchronously
      // Just return immediately to prevent blocking startup
      return;
    } catch (error) {
      if (error.name === 'ResourceInUseException') {
        // Table already exists, this is fine
        console.log(`Table ${tableName} already exists`);
        return;
      }
      console.error(`Failed to create table ${tableName}:`, error);
      throw error;
    }
  }

  private getTableParams(tableName: string): any {
    const baseParams = {
      TableName: tableName,
      BillingMode: "PAY_PER_REQUEST",
    };

    switch (tableName) {
      case TABLES.USERS:
        return {
          ...baseParams,
          KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
          AttributeDefinitions: [
            { AttributeName: "id", AttributeType: "N" },
            { AttributeName: "email", AttributeType: "S" },
            { AttributeName: "username", AttributeType: "S" }
          ],
          GlobalSecondaryIndexes: [
            {
              IndexName: "EmailIndex",
              KeySchema: [{ AttributeName: "email", KeyType: "HASH" }],
              Projection: { ProjectionType: "ALL" }
            },
            {
              IndexName: "UsernameIndex",
              KeySchema: [{ AttributeName: "username", KeyType: "HASH" }],
              Projection: { ProjectionType: "ALL" }
            }
          ]
        };
      
      case TABLES.CHANNELS:
        return {
          ...baseParams,
          KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
          AttributeDefinitions: [
            { AttributeName: "id", AttributeType: "N" },
            { AttributeName: "userId", AttributeType: "N" }
          ],
          GlobalSecondaryIndexes: [
            {
              IndexName: "UserIdIndex",
              KeySchema: [{ AttributeName: "userId", KeyType: "HASH" }],
              Projection: { ProjectionType: "ALL" }
            }
          ]
        };
      
      case TABLES.VIDEOS:
        return {
          ...baseParams,
          KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
          AttributeDefinitions: [
            { AttributeName: "id", AttributeType: "N" },
            { AttributeName: "userId", AttributeType: "N" }
          ],
          GlobalSecondaryIndexes: [
            {
              IndexName: "UserIdIndex",
              KeySchema: [{ AttributeName: "userId", KeyType: "HASH" }],
              Projection: { ProjectionType: "ALL" }
            }
          ]
        };
      
      case TABLES.COMMENTS:
        return {
          ...baseParams,
          KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
          AttributeDefinitions: [
            { AttributeName: "id", AttributeType: "N" },
            { AttributeName: "videoId", AttributeType: "N" }
          ],
          GlobalSecondaryIndexes: [
            {
              IndexName: "VideoIdIndex",
              KeySchema: [{ AttributeName: "videoId", KeyType: "HASH" }],
              Projection: { ProjectionType: "ALL" }
            }
          ]
        };
      
      case TABLES.SUBSCRIPTIONS:
        return {
          ...baseParams,
          KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
          AttributeDefinitions: [
            { AttributeName: "id", AttributeType: "N" },
            { AttributeName: "userId", AttributeType: "N" }
          ],
          GlobalSecondaryIndexes: [
            {
              IndexName: "UserIdIndex",
              KeySchema: [{ AttributeName: "userId", KeyType: "HASH" }],
              Projection: { ProjectionType: "ALL" }
            }
          ]
        };
      
      case TABLES.LIKED_VIDEOS:
        return {
          ...baseParams,
          KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
          AttributeDefinitions: [
            { AttributeName: "id", AttributeType: "N" },
            { AttributeName: "userId", AttributeType: "N" }
          ],
          GlobalSecondaryIndexes: [
            {
              IndexName: "UserIdIndex",
              KeySchema: [{ AttributeName: "userId", KeyType: "HASH" }],
              Projection: { ProjectionType: "ALL" }
            }
          ]
        };
      
      case TABLES.VIDEO_HISTORY:
        return {
          ...baseParams,
          KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
          AttributeDefinitions: [
            { AttributeName: "id", AttributeType: "N" },
            { AttributeName: "userId", AttributeType: "N" }
          ],
          GlobalSecondaryIndexes: [
            {
              IndexName: "UserIdIndex",
              KeySchema: [{ AttributeName: "userId", KeyType: "HASH" }],
              Projection: { ProjectionType: "ALL" }
            }
          ]
        };
      
      case TABLES.SITE_SETTINGS:
        return {
          ...baseParams,
          KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
          AttributeDefinitions: [
            { AttributeName: "id", AttributeType: "N" }
          ]
        };
      
      default:
        throw new Error(`Unknown table name: ${tableName}`);
    }
  }

  // Helper method to hash passwords
  private hashPassword(password: string): string {
    return crypto.createHash("sha256").update(password).digest("hex");
  }

  // Helper method to compare passwords
  private comparePassword(password: string, hashedPassword: string): boolean {
    const hash = this.hashPassword(password);
    return hash === hashedPassword;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    try {
      const response = await this.docClient.send(
        new GetCommand({
          TableName: TABLES.USERS,
          Key: { id }
        })
      );
      return response.Item as User | undefined;
    } catch (error) {
      console.error(`Error getting user with id ${id}:`, error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      console.log(`Searching for user with username: ${username}`);
      // Since we don't have the UsernameIndex available, use Scan instead
      const response = await this.docClient.send(
        new ScanCommand({
          TableName: TABLES.USERS,
          FilterExpression: "username = :username",
          ExpressionAttributeValues: { ":username": username }
        })
      );
      console.log(`Found ${response.Items?.length || 0} users with username ${username}`);
      return (response.Items && response.Items.length > 0) ? response.Items[0] as User : undefined;
    } catch (error) {
      console.error(`Error getting user by username ${username}:`, error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      console.log(`Searching for user with email: ${email}`);
      // Since we don't have the EmailIndex available, use Scan instead
      const response = await this.docClient.send(
        new ScanCommand({
          TableName: TABLES.USERS,
          FilterExpression: "email = :email",
          ExpressionAttributeValues: { ":email": email }
        })
      );
      console.log(`Found ${response.Items?.length || 0} users with email ${email}`);
      return (response.Items && response.Items.length > 0) ? response.Items[0] as User : undefined;
    } catch (error) {
      console.error(`Error getting user by email ${email}:`, error);
      return undefined;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    // Get max id to generate a new id
    const usersResponse = await this.docClient.send(
      new ScanCommand({
        TableName: TABLES.USERS,
        ProjectionExpression: "id"
      })
    );
    
    const maxId = usersResponse.Items 
      ? Math.max(0, ...usersResponse.Items.map(item => item.id as number))
      : 0;
    
    const newUser: User = {
      id: maxId + 1,
      username: user.username,
      email: user.email,
      password: this.hashPassword(user.password),
      displayName: user.displayName,
      profileImage: user.profileImage || null,
      bio: user.bio || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      subscriberCount: 0,
      isVerified: false
    };

    try {
      await this.docClient.send(
        new PutCommand({
          TableName: TABLES.USERS,
          Item: newUser
        })
      );
      return newUser;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;

    // Prepare update expression and attribute values
    const updateExpressions: string[] = [];
    const expressionAttributeValues: Record<string, any> = {};
    const expressionAttributeNames: Record<string, string> = {};

    // Process each field in userData
    Object.entries(userData).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'createdAt') {
        updateExpressions.push(`#${key} = :${key}`);
        expressionAttributeValues[`:${key}`] = value;
        expressionAttributeNames[`#${key}`] = key;
      }
    });
    
    // Add updatedAt field
    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();
    expressionAttributeNames['#updatedAt'] = 'updatedAt';

    try {
      const response = await this.docClient.send(
        new UpdateCommand({
          TableName: TABLES.USERS,
          Key: { id },
          UpdateExpression: `SET ${updateExpressions.join(', ')}`,
          ExpressionAttributeValues: expressionAttributeValues,
          ExpressionAttributeNames: expressionAttributeNames,
          ReturnValues: "ALL_NEW"
        })
      );
      
      return response.Attributes as User;
    } catch (error) {
      console.error(`Error updating user with id ${id}:`, error);
      return undefined;
    }
  }

  // Channel methods
  async getChannel(id: number): Promise<Channel | undefined> {
    try {
      const response = await this.docClient.send(
        new GetCommand({
          TableName: TABLES.CHANNELS,
          Key: { id }
        })
      );
      return response.Item as Channel | undefined;
    } catch (error) {
      console.error(`Error getting channel with id ${id}:`, error);
      return undefined;
    }
  }

  async getChannelsByUser(userId: number): Promise<Channel[]> {
    try {
      console.log(`Fetching channels for user ${userId}`);
      // Since secondary indexes might not be available, use Scan instead
      const response = await this.docClient.send(
        new ScanCommand({
          TableName: TABLES.CHANNELS,
          FilterExpression: "userId = :userId",
          ExpressionAttributeValues: { ":userId": userId }
        })
      );
      console.log(`Found ${response.Items?.length || 0} channels for user ${userId}`);
      return response.Items as Channel[] || [];
    } catch (error) {
      console.error(`Error getting channels for user ${userId}:`, error);
      return [];
    }
  }

  async createChannel(channel: InsertChannel): Promise<Channel> {
    // Get max id to generate a new id
    const channelsResponse = await this.docClient.send(
      new ScanCommand({
        TableName: TABLES.CHANNELS,
        ProjectionExpression: "id"
      })
    );
    
    const maxId = channelsResponse.Items 
      ? Math.max(0, ...channelsResponse.Items.map(item => item.id as number))
      : 0;
    
    const newChannel: Channel = {
      id: maxId + 1,
      userId: channel.userId,
      name: channel.name,
      description: channel.description || null,
      bannerImage: channel.bannerImage || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await this.docClient.send(
        new PutCommand({
          TableName: TABLES.CHANNELS,
          Item: newChannel
        })
      );
      return newChannel;
    } catch (error) {
      console.error("Error creating channel:", error);
      throw error;
    }
  }
  
  async updateChannel(id: number, channelData: Partial<Channel>): Promise<Channel | undefined> {
    try {
      // First, get the existing channel
      const response = await this.docClient.send(
        new GetCommand({
          TableName: TABLES.CHANNELS,
          Key: { id }
        })
      );
      
      if (!response.Item) {
        return undefined;
      }
      
      const existingChannel = response.Item as Channel;
      
      // Merge updates
      const updatedChannel = {
        ...existingChannel,
        ...channelData,
        // Always update the updatedAt timestamp
        updatedAt: new Date().toISOString()
      };
      
      // Save the updated channel
      await this.docClient.send(
        new PutCommand({
          TableName: TABLES.CHANNELS,
          Item: updatedChannel
        })
      );
      
      return updatedChannel;
    } catch (error) {
      console.error(`Error updating channel with id ${id}:`, error);
      throw error;
    }
  }

  // Video methods
  async getVideo(id: number): Promise<Video | undefined> {
    try {
      const response = await this.docClient.send(
        new GetCommand({
          TableName: TABLES.VIDEOS,
          Key: { id }
        })
      );
      return response.Item as Video | undefined;
    } catch (error) {
      console.error(`Error getting video with id ${id}:`, error);
      return undefined;
    }
  }

  async getVideos(limit = 50, offset = 0): Promise<Video[]> {
    try {
      console.log('Fetching videos from DynamoDB with limit:', limit);
      const response = await this.docClient.send(
        new ScanCommand({
          TableName: TABLES.VIDEOS,
          Limit: 100 // Request more to ensure we get enough after filtering
        })
      );

      const videos = response.Items as Video[] || [];
      console.log(`Found ${videos.length} videos in DynamoDB`);
      
      if (videos.length > 0) {
        console.log('Sample video data:', JSON.stringify(videos[0]));
      }
      
      return videos.slice(offset, offset + limit);
    } catch (error) {
      console.error("Error getting videos:", error);
      return [];
    }
  }

  async getVideosByUser(userId: number): Promise<Video[]> {
    try {
      console.log(`Fetching videos for user ${userId} using scan`);
      // Since indexes might not be properly set up, use Scan instead
      const response = await this.docClient.send(
        new ScanCommand({
          TableName: TABLES.VIDEOS,
          FilterExpression: "userId = :userId",
          ExpressionAttributeValues: { ":userId": userId }
        })
      );
      console.log(`Found ${response.Items?.length || 0} videos for user ${userId}`);
      return response.Items as Video[] || [];
    } catch (error) {
      console.error(`Error getting videos for user ${userId}:`, error);
      return [];
    }
  }

  async getRecentVideos(limit = 8): Promise<Video[]> {
    try {
      console.log('Fetching recent videos from DynamoDB with limit:', limit);
      const response = await this.docClient.send(
        new ScanCommand({
          TableName: TABLES.VIDEOS,
          Limit: 100 // Get more videos to filter/sort
        })
      );

      const videos = response.Items as Video[] || [];
      console.log(`Found ${videos.length} total videos for recent videos section`);
      
      const filteredVideos = videos.filter(video => !video.isQuickie);
      console.log(`After filtering out quickies: ${filteredVideos.length} videos remain`);
      
      const sortedVideos = filteredVideos
        .sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        })
        .slice(0, limit);
      
      console.log(`Returning ${sortedVideos.length} recent videos`);
      if (sortedVideos.length > 0) {
        console.log('First recent video:', JSON.stringify(sortedVideos[0]));
      }
      
      return sortedVideos;
    } catch (error) {
      console.error("Error getting recent videos:", error);
      return [];
    }
  }

  async getTrendingVideos(limit = 8): Promise<Video[]> {
    try {
      console.log('Fetching trending videos from DynamoDB with limit:', limit);
      const response = await this.docClient.send(
        new ScanCommand({
          TableName: TABLES.VIDEOS,
          Limit: 100 // Fetch more videos to filter/sort
        })
      );

      const videos = response.Items as Video[] || [];
      console.log(`Found ${videos.length} total videos for trending section`);
      
      const filteredVideos = videos.filter(video => !video.isQuickie);
      console.log(`After filtering out quickies: ${filteredVideos.length} videos remain`);
      
      const sortedVideos = filteredVideos
        .sort((a, b) => (b.views || 0) - (a.views || 0))
        .slice(0, limit);
      
      console.log(`Returning ${sortedVideos.length} trending videos`);
      if (sortedVideos.length > 0) {
        console.log('First trending video:', JSON.stringify(sortedVideos[0]));
      }
      
      return sortedVideos;
    } catch (error) {
      console.error("Error getting trending videos:", error);
      return [];
    }
  }

  async getQuickies(limit = 12): Promise<Video[]> {
    try {
      console.log('Fetching quickie videos from DynamoDB');
      const response = await this.docClient.send(
        new ScanCommand({
          TableName: TABLES.VIDEOS,
          Limit: 100 // Scan all videos to find quickies
        })
      );

      const videos = response.Items as Video[] || [];
      console.log(`Found ${videos.length} total videos when searching for quickies`);
      
      // Filter quickies manually instead of using FilterExpression to avoid issues
      const quickies = videos.filter(video => video.isQuickie === true);
      console.log(`Found ${quickies.length} quickie videos after filtering`);
      
      const sortedQuickies = quickies
        .sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        })
        .slice(0, limit);
      
      console.log(`Returning ${sortedQuickies.length} quickie videos`);
      if (sortedQuickies.length > 0) {
        console.log('First quickie video:', JSON.stringify(sortedQuickies[0]));
      }
      
      return sortedQuickies;
    } catch (error) {
      console.error("Error getting quickies:", error);
      return [];
    }
  }

  async createVideo(video: InsertVideo): Promise<Video> {
    // Get max id to generate a new id
    const videosResponse = await this.docClient.send(
      new ScanCommand({
        TableName: TABLES.VIDEOS,
        ProjectionExpression: "id"
      })
    );
    
    const maxId = videosResponse.Items 
      ? Math.max(0, ...videosResponse.Items.map(item => item.id as number))
      : 0;
    
    // Add more debugging information
    console.log('Creating video with input data:', JSON.stringify(video));
    
    const newVideo: Video = {
      id: maxId + 1,
      userId: video.userId,
      title: video.title,
      description: video.description || null,
      filePath: video.filePath, // Use filePath instead of videoPath
      thumbnailPath: video.thumbnailPath || null,
      duration: video.duration || 0,
      views: 0,
      likes: 0,
      dislikes: 0,
      hasAds: false,
      adUrl: null,
      adStartTime: null,
      isQuickie: video.isQuickie || false,
      isPublished: video.isPublished !== undefined ? video.isPublished : true, // Make sure isPublished is defined
      categories: video.categories || [],
      tags: video.tags || [],
      createdAt: new Date().toISOString(),
    };
    
    console.log('Prepared new video object for DynamoDB:', JSON.stringify(newVideo));

    try {
      await this.docClient.send(
        new PutCommand({
          TableName: TABLES.VIDEOS,
          Item: newVideo
        })
      );
      return newVideo;
    } catch (error) {
      console.error("Error creating video:", error);
      throw error;
    }
  }

  async updateVideo(id: number, videoData: Partial<Video>): Promise<Video | undefined> {
    const video = await this.getVideo(id);
    if (!video) return undefined;

    // Prepare update expression and attribute values
    const updateExpressions: string[] = [];
    const expressionAttributeValues: Record<string, any> = {};
    const expressionAttributeNames: Record<string, string> = {};

    // Process each field in videoData
    Object.entries(videoData).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'createdAt') {
        updateExpressions.push(`#${key} = :${key}`);
        expressionAttributeValues[`:${key}`] = value;
        expressionAttributeNames[`#${key}`] = key;
      }
    });
    
    // Add updatedAt field
    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();
    expressionAttributeNames['#updatedAt'] = 'updatedAt';

    try {
      const response = await this.docClient.send(
        new UpdateCommand({
          TableName: TABLES.VIDEOS,
          Key: { id },
          UpdateExpression: `SET ${updateExpressions.join(', ')}`,
          ExpressionAttributeValues: expressionAttributeValues,
          ExpressionAttributeNames: expressionAttributeNames,
          ReturnValues: "ALL_NEW"
        })
      );
      
      return response.Attributes as Video;
    } catch (error) {
      console.error(`Error updating video with id ${id}:`, error);
      return undefined;
    }
  }

  async incrementVideoViews(id: number): Promise<Video | undefined> {
    const video = await this.getVideo(id);
    if (!video) return undefined;

    try {
      const response = await this.docClient.send(
        new UpdateCommand({
          TableName: TABLES.VIDEOS,
          Key: { id },
          UpdateExpression: "SET views = if_not_exists(views, :zero) + :increment, updatedAt = :updatedAt",
          ExpressionAttributeValues: {
            ":zero": 0,
            ":increment": 1,
            ":updatedAt": new Date().toISOString()
          },
          ReturnValues: "ALL_NEW"
        })
      );
      
      return response.Attributes as Video;
    } catch (error) {
      console.error(`Error incrementing views for video ${id}:`, error);
      return undefined;
    }
  }

  // Comment methods
  async getComment(id: number): Promise<Comment | undefined> {
    try {
      const response = await this.docClient.send(
        new GetCommand({
          TableName: TABLES.COMMENTS,
          Key: { id }
        })
      );
      return response.Item as Comment | undefined;
    } catch (error) {
      console.error(`Error getting comment with id ${id}:`, error);
      return undefined;
    }
  }

  async getCommentsByVideo(videoId: number): Promise<Comment[]> {
    try {
      const response = await this.docClient.send(
        new QueryCommand({
          TableName: TABLES.COMMENTS,
          IndexName: "VideoIdIndex",
          KeyConditionExpression: "videoId = :videoId",
          ExpressionAttributeValues: { ":videoId": videoId }
        })
      );
      
      const comments = response.Items as Comment[] || [];
      return comments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      console.error(`Error getting comments for video ${videoId}:`, error);
      return [];
    }
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    // Get max id to generate a new id
    const commentsResponse = await this.docClient.send(
      new ScanCommand({
        TableName: TABLES.COMMENTS,
        ProjectionExpression: "id"
      })
    );
    
    const maxId = commentsResponse.Items 
      ? Math.max(0, ...commentsResponse.Items.map(item => item.id as number))
      : 0;
    
    const newComment: Comment = {
      id: maxId + 1,
      userId: comment.userId,
      videoId: comment.videoId,
      content: comment.content,
      likes: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      parentId: comment.parentId || null
    };

    try {
      await this.docClient.send(
        new PutCommand({
          TableName: TABLES.COMMENTS,
          Item: newComment
        })
      );
      return newComment;
    } catch (error) {
      console.error("Error creating comment:", error);
      throw error;
    }
  }

  // Subscription methods
  async getSubscription(id: number): Promise<Subscription | undefined> {
    try {
      const response = await this.docClient.send(
        new GetCommand({
          TableName: TABLES.SUBSCRIPTIONS,
          Key: { id }
        })
      );
      return response.Item as Subscription | undefined;
    } catch (error) {
      console.error(`Error getting subscription with id ${id}:`, error);
      return undefined;
    }
  }

  async getSubscriptionsByUser(userId: number): Promise<Subscription[]> {
    try {
      const response = await this.docClient.send(
        new QueryCommand({
          TableName: TABLES.SUBSCRIPTIONS,
          IndexName: "UserIdIndex",
          KeyConditionExpression: "userId = :userId",
          ExpressionAttributeValues: { ":userId": userId }
        })
      );
      return response.Items as Subscription[] || [];
    } catch (error) {
      console.error(`Error getting subscriptions for user ${userId}:`, error);
      return [];
    }
  }

  async createSubscription(subscription: InsertSubscription): Promise<Subscription> {
    // Get max id to generate a new id
    const subscriptionsResponse = await this.docClient.send(
      new ScanCommand({
        TableName: TABLES.SUBSCRIPTIONS,
        ProjectionExpression: "id"
      })
    );
    
    const maxId = subscriptionsResponse.Items 
      ? Math.max(0, ...subscriptionsResponse.Items.map(item => item.id as number))
      : 0;
    
    const newSubscription: Subscription = {
      id: maxId + 1,
      userId: subscription.userId,
      channelId: subscription.channelId,
      createdAt: new Date().toISOString()
    };

    try {
      await this.docClient.send(
        new PutCommand({
          TableName: TABLES.SUBSCRIPTIONS,
          Item: newSubscription
        })
      );

      // Increment subscriber count for the channel owner
      const channel = await this.getChannel(subscription.channelId);
      if (channel) {
        const user = await this.getUser(channel.userId);
        if (user) {
          await this.updateUser(user.id, {
            subscriberCount: (user.subscriberCount || 0) + 1
          });
        }
      }

      return newSubscription;
    } catch (error) {
      console.error("Error creating subscription:", error);
      throw error;
    }
  }

  // Liked videos methods
  async getLikedVideo(id: number): Promise<LikedVideo | undefined> {
    try {
      const response = await this.docClient.send(
        new GetCommand({
          TableName: TABLES.LIKED_VIDEOS,
          Key: { id }
        })
      );
      return response.Item as LikedVideo | undefined;
    } catch (error) {
      console.error(`Error getting liked video with id ${id}:`, error);
      return undefined;
    }
  }

  async getLikedVideosByUser(userId: number): Promise<LikedVideo[]> {
    try {
      const response = await this.docClient.send(
        new QueryCommand({
          TableName: TABLES.LIKED_VIDEOS,
          IndexName: "UserIdIndex",
          KeyConditionExpression: "userId = :userId",
          ExpressionAttributeValues: { ":userId": userId }
        })
      );
      return response.Items as LikedVideo[] || [];
    } catch (error) {
      console.error(`Error getting liked videos for user ${userId}:`, error);
      return [];
    }
  }

  async createLikedVideo(likedVideo: InsertLikedVideo): Promise<LikedVideo> {
    // Get max id to generate a new id
    const likedVideosResponse = await this.docClient.send(
      new ScanCommand({
        TableName: TABLES.LIKED_VIDEOS,
        ProjectionExpression: "id"
      })
    );
    
    const maxId = likedVideosResponse.Items 
      ? Math.max(0, ...likedVideosResponse.Items.map(item => item.id as number))
      : 0;
    
    const newLikedVideo: LikedVideo = {
      id: maxId + 1,
      userId: likedVideo.userId,
      videoId: likedVideo.videoId,
      createdAt: new Date().toISOString()
    };

    try {
      await this.docClient.send(
        new PutCommand({
          TableName: TABLES.LIKED_VIDEOS,
          Item: newLikedVideo
        })
      );

      // Increment likes count for the video
      const video = await this.getVideo(likedVideo.videoId);
      if (video) {
        await this.updateVideo(video.id, {
          likes: (video.likes || 0) + 1
        });
      }

      return newLikedVideo;
    } catch (error) {
      console.error("Error creating liked video:", error);
      throw error;
    }
  }

  // Video history methods
  async getVideoHistory(id: number): Promise<VideoHistory | undefined> {
    try {
      const response = await this.docClient.send(
        new GetCommand({
          TableName: TABLES.VIDEO_HISTORY,
          Key: { id }
        })
      );
      return response.Item as VideoHistory | undefined;
    } catch (error) {
      console.error(`Error getting video history with id ${id}:`, error);
      return undefined;
    }
  }

  async getVideoHistoryByUser(userId: number): Promise<VideoHistory[]> {
    try {
      const response = await this.docClient.send(
        new QueryCommand({
          TableName: TABLES.VIDEO_HISTORY,
          IndexName: "UserIdIndex",
          KeyConditionExpression: "userId = :userId",
          ExpressionAttributeValues: { ":userId": userId }
        })
      );
      
      const history = response.Items as VideoHistory[] || [];
      return history.sort((a, b) => new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime());
    } catch (error) {
      console.error(`Error getting video history for user ${userId}:`, error);
      return [];
    }
  }

  async createVideoHistory(videoHistory: InsertVideoHistory): Promise<VideoHistory> {
    // Get max id to generate a new id
    const videoHistoryResponse = await this.docClient.send(
      new ScanCommand({
        TableName: TABLES.VIDEO_HISTORY,
        ProjectionExpression: "id"
      })
    );
    
    const maxId = videoHistoryResponse.Items 
      ? Math.max(0, ...videoHistoryResponse.Items.map(item => item.id as number))
      : 0;
    
    const newVideoHistory: VideoHistory = {
      id: maxId + 1,
      userId: videoHistory.userId,
      videoId: videoHistory.videoId,
      viewedAt: new Date().toISOString(),
      watchDuration: videoHistory.watchDuration || 0
    };

    try {
      await this.docClient.send(
        new PutCommand({
          TableName: TABLES.VIDEO_HISTORY,
          Item: newVideoHistory
        })
      );

      return newVideoHistory;
    } catch (error) {
      console.error("Error creating video history:", error);
      throw error;
    }
  }

  // Authentication methods
  async authenticateUser(email: string, password: string): Promise<User | undefined> {
    const user = await this.getUserByEmail(email);
    if (!user) return undefined;

    const isPasswordValid = this.comparePassword(password, user.password);
    return isPasswordValid ? user : undefined;
  }
  
  // Implementation of missing methods declared at the class level
  async getAllUsers(): Promise<User[]> {
    await this.initialize();
    
    try {
      const command = new ScanCommand({
        TableName: TABLES.USERS
      });
      
      const response = await this.docClient.send(command);
      return response.Items as User[] || [];
    } catch (error) {
      console.error('Error getting all users from DynamoDB:', error);
      return [];
    }
  }
  
  async deleteVideo(id: number): Promise<boolean> {
    await this.initialize();
    
    try {
      // First, get the video to know the file paths
      const video = await this.getVideo(id);
      if (!video) {
        return false;
      }
      
      // Delete the video entry from DynamoDB
      const command = new DeleteCommand({
        TableName: TABLES.VIDEOS,
        Key: { id }
      });
      
      await this.docClient.send(command);
      
      // Delete related comments
      const commentsCommand = new ScanCommand({
        TableName: TABLES.COMMENTS,
        FilterExpression: 'videoId = :videoId',
        ExpressionAttributeValues: {
          ':videoId': id
        }
      });
      
      const commentsResponse = await this.docClient.send(commentsCommand);
      const comments = commentsResponse.Items || [];
      
      for (const comment of comments) {
        await this.docClient.send(new DeleteCommand({
          TableName: TABLES.COMMENTS,
          Key: { id: comment.id }
        }));
      }
      
      // Delete related likes
      const likesCommand = new ScanCommand({
        TableName: TABLES.LIKED_VIDEOS,
        FilterExpression: 'videoId = :videoId',
        ExpressionAttributeValues: {
          ':videoId': id
        }
      });
      
      const likesResponse = await this.docClient.send(likesCommand);
      const likes = likesResponse.Items || [];
      
      for (const like of likes) {
        await this.docClient.send(new DeleteCommand({
          TableName: TABLES.LIKED_VIDEOS,
          Key: { id: like.id }
        }));
      }
      
      // Delete related history
      const historyCommand = new ScanCommand({
        TableName: TABLES.VIDEO_HISTORY,
        FilterExpression: 'videoId = :videoId',
        ExpressionAttributeValues: {
          ':videoId': id
        }
      });
      
      const historyResponse = await this.docClient.send(historyCommand);
      const history = historyResponse.Items || [];
      
      for (const item of history) {
        await this.docClient.send(new DeleteCommand({
          TableName: TABLES.VIDEO_HISTORY,
          Key: { id: item.id }
        }));
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting video from DynamoDB:', error);
      return false;
    }
  }
  
  // Site settings methods
  async getSiteSettings(): Promise<SiteSettings | undefined> {
    try {
      const response = await this.docClient.send(
        new GetCommand({
          TableName: TABLES.SITE_SETTINGS,
          Key: { id: 1 } // Always use ID 1 for the single site settings record
        })
      );
      
      if (response.Item) {
        return response.Item as SiteSettings;
      }
      
      // If no settings exist, create default settings
      const defaultSettings = await this.updateSiteSettings(this.defaultSiteSettings);
      return defaultSettings;
    } catch (error) {
      console.error("Error getting site settings:", error);
      return this.defaultSiteSettings;
    }
  }

  async updateSiteSettings(settings: Partial<SiteSettings>): Promise<SiteSettings> {
    try {
      // Check if settings already exist
      const existingSettings = await this.docClient.send(
        new GetCommand({
          TableName: TABLES.SITE_SETTINGS,
          Key: { id: 1 }
        })
      );
      
      const updatedSettings: SiteSettings = {
        ...(existingSettings.Item as SiteSettings || this.defaultSiteSettings),
        ...settings,
        id: 1, // Always use ID 1
        updatedAt: new Date().toISOString()
      };
      
      await this.docClient.send(
        new PutCommand({
          TableName: TABLES.SITE_SETTINGS,
          Item: updatedSettings
        })
      );
      
      return updatedSettings;
    } catch (error) {
      console.error("Error updating site settings:", error);
      return this.defaultSiteSettings;
    }
  }
  
  // Video ad toggle method
  async toggleVideoAds(id: number, hasAds: boolean, adUrl?: string, adStartTime?: number): Promise<Video | undefined> {
    const video = await this.getVideo(id);
    if (!video) return undefined;
    
    const updateData: Partial<Video> = {
      hasAds,
      adUrl: hasAds ? adUrl || null : null,
      adStartTime: hasAds && adStartTime !== undefined ? adStartTime : null
    };
    
    return this.updateVideo(id, updateData);
  }
}

// Create a singleton instance
export const dynamoDBStorage = new DynamoDBStorage();
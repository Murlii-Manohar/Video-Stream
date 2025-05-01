import { 
  DynamoDBClient, 
  CreateTableCommand, 
  ListTablesCommand, 
  DescribeTableCommand 
} from "@aws-sdk/client-dynamodb";
import { 
  DynamoDBDocumentClient, 
  GetCommand, 
  PutCommand, 
  QueryCommand, 
  ScanCommand, 
  UpdateCommand 
} from "@aws-sdk/lib-dynamodb";
import { 
  User, InsertUser, 
  Channel, InsertChannel, 
  Video, InsertVideo, 
  Comment, InsertComment, 
  Subscription, InsertSubscription, 
  LikedVideo, InsertLikedVideo, 
  VideoHistory, InsertVideoHistory 
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
  VIDEO_HISTORY: "XPlayHD_VideoHistory"
};

export class DynamoDBStorage implements IStorage {
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

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Create a promise with timeout for listing tables
      const listTablesPromise = Promise.race([
        this.client.send(new ListTablesCommand({})),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("DynamoDB ListTables operation timed out after 5 seconds")), 5000)
        )
      ]);

      // Get table names with timeout 
      const { TableNames } = await listTablesPromise as any;
      
      // Create tables that don't exist
      const tablesToCreate = Object.values(TABLES).filter(tableName => 
        !TableNames?.includes(tableName)
      );

      // Only create first table during initialization, the rest can be created asynchronously
      if (tablesToCreate.length > 0) {
        console.log(`Need to create ${tablesToCreate.length} tables: ${tablesToCreate.join(', ')}`);
        // Only create the first table synchronously to prevent long initialization time
        if (tablesToCreate.length > 0) {
          await this.createTable(tablesToCreate[0]);
          
          // Create the rest of the tables asynchronously
          if (tablesToCreate.length > 1) {
            // Don't wait for this promise
            (async () => {
              for (let i = 1; i < tablesToCreate.length; i++) {
                try {
                  await this.createTable(tablesToCreate[i]);
                } catch (error) {
                  console.error(`Failed to create table ${tablesToCreate[i]} asynchronously:`, error);
                }
              }
            })();
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
      const response = await this.docClient.send(
        new QueryCommand({
          TableName: TABLES.USERS,
          IndexName: "UsernameIndex",
          KeyConditionExpression: "username = :username",
          ExpressionAttributeValues: { ":username": username }
        })
      );
      return (response.Items && response.Items.length > 0) ? response.Items[0] as User : undefined;
    } catch (error) {
      console.error(`Error getting user by username ${username}:`, error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const response = await this.docClient.send(
        new QueryCommand({
          TableName: TABLES.USERS,
          IndexName: "EmailIndex",
          KeyConditionExpression: "email = :email",
          ExpressionAttributeValues: { ":email": email }
        })
      );
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
      const response = await this.docClient.send(
        new QueryCommand({
          TableName: TABLES.CHANNELS,
          IndexName: "UserIdIndex",
          KeyConditionExpression: "userId = :userId",
          ExpressionAttributeValues: { ":userId": userId }
        })
      );
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
      const response = await this.docClient.send(
        new ScanCommand({
          TableName: TABLES.VIDEOS,
          Limit: limit
        })
      );

      const videos = response.Items as Video[] || [];
      return videos.slice(offset, offset + limit);
    } catch (error) {
      console.error("Error getting videos:", error);
      return [];
    }
  }

  async getVideosByUser(userId: number): Promise<Video[]> {
    try {
      const response = await this.docClient.send(
        new QueryCommand({
          TableName: TABLES.VIDEOS,
          IndexName: "UserIdIndex",
          KeyConditionExpression: "userId = :userId",
          ExpressionAttributeValues: { ":userId": userId }
        })
      );
      return response.Items as Video[] || [];
    } catch (error) {
      console.error(`Error getting videos for user ${userId}:`, error);
      return [];
    }
  }

  async getRecentVideos(limit = 8): Promise<Video[]> {
    try {
      const response = await this.docClient.send(
        new ScanCommand({
          TableName: TABLES.VIDEOS,
          Limit: limit
        })
      );

      const videos = response.Items as Video[] || [];
      return videos
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);
    } catch (error) {
      console.error("Error getting recent videos:", error);
      return [];
    }
  }

  async getTrendingVideos(limit = 8): Promise<Video[]> {
    try {
      const response = await this.docClient.send(
        new ScanCommand({
          TableName: TABLES.VIDEOS,
          Limit: limit * 2 // Fetch more videos to sort
        })
      );

      const videos = response.Items as Video[] || [];
      return videos
        .sort((a, b) => (b.views || 0) - (a.views || 0))
        .slice(0, limit);
    } catch (error) {
      console.error("Error getting trending videos:", error);
      return [];
    }
  }

  async getQuickies(limit = 12): Promise<Video[]> {
    try {
      const response = await this.docClient.send(
        new ScanCommand({
          TableName: TABLES.VIDEOS,
          FilterExpression: "isQuickie = :isQuickie",
          ExpressionAttributeValues: { ":isQuickie": true },
          Limit: limit * 2 // Fetch more videos to sort
        })
      );

      const videos = response.Items as Video[] || [];
      return videos
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);
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
    
    const newVideo: Video = {
      id: maxId + 1,
      userId: video.userId,
      title: video.title,
      description: video.description || null,
      videoPath: video.videoPath,
      thumbnailPath: video.thumbnailPath || null,
      duration: video.duration || 0,
      views: 0,
      likes: 0,
      isQuickie: video.isQuickie || false,
      isPrivate: video.isPrivate || false,
      category: video.category || null,
      tags: video.tags || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

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
}

// Create a singleton instance
export const dynamoDBStorage = new DynamoDBStorage();
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and, desc, sql } from 'drizzle-orm';
import * as schema from '@shared/schema';
import {
  users,
  channels,
  videos,
  comments,
  subscriptions,
  likedVideos,
  videoHistory,
  siteSettings,
  type User,
  type InsertUser,
  type Channel,
  type InsertChannel,
  type Video,
  type InsertVideo,
  type Comment,
  type InsertComment,
  type Subscription,
  type InsertSubscription,
  type LikedVideo,
  type InsertLikedVideo,
  type VideoHistory,
  type InsertVideoHistory,
  type SiteSettings
} from '@shared/schema';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { IStorage } from './storage';

export class PostgresDBStorage implements IStorage {
  private pool: Pool;
  private db: any;
  private initialized: boolean = false;
  private defaultSiteSettings: SiteSettings = {
    id: 1,
    siteName: 'XPlayHD',
    siteDescription: 'Adult Video Streaming Platform',
    logo: null,
    theme: 'dark',
    adsEnabled: false,
    globalAdUrl: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    this.db = drizzle(this.pool, { schema });
    
    // Initialize the database on construction
    this.initialize().catch(err => {
      console.error('Failed to initialize PostgresDBStorage:', err);
    });
  }

  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Directly check if site settings exists without calling getSiteSettings()
      try {
        const result = await this.db.select().from(siteSettings).limit(1);
        
        if (result.length === 0) {
          // Create default settings if none exist
          await this.db.insert(siteSettings).values({
            id: 1,
            siteAdsEnabled: false,
            siteAdUrls: [],
            siteAdPositions: [],
            updatedAt: new Date()
          }).returning();
          
          console.log('Created default site settings');
        }
      } catch (error) {
        console.error('Error checking site settings during initialization:', error);
      }
      
      this.initialized = true;
      console.log('PostgresDBStorage initialized successfully');
    } catch (error) {
      console.error('Error initializing PostgresDBStorage:', error);
      throw error;
    }
  }

  // User methods
  
  private hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = createHash('sha256');
    hash.update(password + salt);
    return `${hash.digest('hex')}.${salt}`;
  }

  private comparePassword(password: string, hashedPassword: string): boolean {
    const [hash, salt] = hashedPassword.split('.');
    const inputHash = createHash('sha256');
    inputHash.update(password + salt);
    return hash === inputHash.digest('hex');
  }

  async getUser(id: number): Promise<User | undefined> {
    if (!this.initialized) await this.initialize();
    
    try {
      const result = await this.db.select().from(users).where(eq(users.id, id));
      return result.length > 0 ? result[0] : undefined;
    } catch (error) {
      console.error(`Error getting user with ID ${id}:`, error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    if (!this.initialized) await this.initialize();
    
    try {
      const result = await this.db.select().from(users).where(eq(users.username, username));
      return result.length > 0 ? result[0] : undefined;
    } catch (error) {
      console.error(`Error getting user with username ${username}:`, error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    if (!this.initialized) await this.initialize();
    
    console.log(`Searching for user with email: ${email}`);
    
    try {
      const result = await this.db.select().from(users).where(eq(users.email, email));
      console.log(`Found ${result.length} users with email ${email}`);
      return result.length > 0 ? result[0] : undefined;
    } catch (error) {
      console.error(`Error getting user with email ${email}:`, error);
      return undefined;
    }
  }

  async getAllUsers(): Promise<User[]> {
    if (!this.initialized) await this.initialize();
    
    try {
      return await this.db.select().from(users);
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  async createUser(userData: InsertUser): Promise<User> {
    if (!this.initialized) await this.initialize();
    
    const hashedPassword = this.hashPassword(userData.password);
    
    try {
      const inserted = await this.db.insert(users).values({
        ...userData,
        password: hashedPassword,
        isAdmin: userData.email === 'm.manohar2003@gmail.com' ? true : false,
        subscriberCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      return inserted[0];
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    if (!this.initialized) await this.initialize();
    
    try {
      // If password is being updated, hash it
      if (userData.password) {
        userData.password = this.hashPassword(userData.password);
      }
      
      userData.updatedAt = new Date();
      
      const updated = await this.db.update(users)
        .set(userData)
        .where(eq(users.id, id))
        .returning();
      
      return updated.length > 0 ? updated[0] : undefined;
    } catch (error) {
      console.error(`Error updating user with ID ${id}:`, error);
      return undefined;
    }
  }

  // Channel methods
  
  async getChannel(id: number): Promise<Channel | undefined> {
    if (!this.initialized) await this.initialize();
    
    try {
      const result = await this.db.select().from(channels).where(eq(channels.id, id));
      return result.length > 0 ? result[0] : undefined;
    } catch (error) {
      console.error(`Error getting channel with ID ${id}:`, error);
      return undefined;
    }
  }

  async getChannelsByUser(userId: number): Promise<Channel[]> {
    if (!this.initialized) await this.initialize();
    
    try {
      return await this.db.select().from(channels).where(eq(channels.userId, userId));
    } catch (error) {
      console.error(`Error getting channels for user with ID ${userId}:`, error);
      return [];
    }
  }

  async createChannel(channelData: InsertChannel): Promise<Channel> {
    if (!this.initialized) await this.initialize();
    
    try {
      const inserted = await this.db.insert(channels).values({
        ...channelData,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      return inserted[0];
    } catch (error) {
      console.error('Error creating channel:', error);
      throw error;
    }
  }

  async updateChannel(id: number, channelData: Partial<Channel>): Promise<Channel | undefined> {
    if (!this.initialized) await this.initialize();
    
    try {
      channelData.updatedAt = new Date();
      
      const updated = await this.db.update(channels)
        .set(channelData)
        .where(eq(channels.id, id))
        .returning();
      
      return updated.length > 0 ? updated[0] : undefined;
    } catch (error) {
      console.error(`Error updating channel with ID ${id}:`, error);
      return undefined;
    }
  }

  // Video methods
  
  async getVideo(id: number): Promise<Video | undefined> {
    if (!this.initialized) await this.initialize();
    
    try {
      const result = await this.db.select().from(videos).where(eq(videos.id, id));
      return result.length > 0 ? result[0] : undefined;
    } catch (error) {
      console.error(`Error getting video with ID ${id}:`, error);
      return undefined;
    }
  }

  async getVideos(limit = 50, offset = 0): Promise<Video[]> {
    if (!this.initialized) await this.initialize();
    
    try {
      return await this.db.select().from(videos)
        .where(eq(videos.isPublished, true))
        .orderBy(desc(videos.createdAt))
        .limit(limit)
        .offset(offset);
    } catch (error) {
      console.error('Error getting videos:', error);
      return [];
    }
  }

  async getVideosByUser(userId: number): Promise<Video[]> {
    if (!this.initialized) await this.initialize();
    
    try {
      return await this.db.select().from(videos)
        .where(eq(videos.userId, userId))
        .orderBy(desc(videos.createdAt));
    } catch (error) {
      console.error(`Error getting videos for user with ID ${userId}:`, error);
      return [];
    }
  }

  async getRecentVideos(limit = 8): Promise<Video[]> {
    if (!this.initialized) await this.initialize();
    
    try {
      return await this.db.select().from(videos)
        .where(and(
          eq(videos.isPublished, true),
          eq(videos.isQuickie, false)
        ))
        .orderBy(desc(videos.createdAt))
        .limit(limit);
    } catch (error) {
      console.error('Error getting recent videos:', error);
      return [];
    }
  }

  async getTrendingVideos(limit = 8): Promise<Video[]> {
    if (!this.initialized) await this.initialize();
    
    try {
      return await this.db.select().from(videos)
        .where(and(
          eq(videos.isPublished, true),
          eq(videos.isQuickie, false)
        ))
        .orderBy(desc(videos.views))
        .limit(limit);
    } catch (error) {
      console.error('Error getting trending videos:', error);
      return [];
    }
  }

  async getQuickies(limit = 12): Promise<Video[]> {
    if (!this.initialized) await this.initialize();
    
    try {
      return await this.db.select().from(videos)
        .where(and(
          eq(videos.isPublished, true),
          eq(videos.isQuickie, true)
        ))
        .orderBy(desc(videos.createdAt))
        .limit(limit);
    } catch (error) {
      console.error('Error getting quickie videos:', error);
      return [];
    }
  }

  async createVideo(videoData: InsertVideo): Promise<Video> {
    if (!this.initialized) await this.initialize();
    
    try {
      const inserted = await this.db.insert(videos).values({
        ...videoData,
        views: 0,
        likes: 0,
        dislikes: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      return inserted[0];
    } catch (error) {
      console.error('Error creating video:', error);
      throw error;
    }
  }

  async updateVideo(id: number, videoData: Partial<Video>): Promise<Video | undefined> {
    if (!this.initialized) await this.initialize();
    
    try {
      videoData.updatedAt = new Date();
      
      const updated = await this.db.update(videos)
        .set(videoData)
        .where(eq(videos.id, id))
        .returning();
      
      return updated.length > 0 ? updated[0] : undefined;
    } catch (error) {
      console.error(`Error updating video with ID ${id}:`, error);
      return undefined;
    }
  }

  async deleteVideo(id: number): Promise<boolean> {
    if (!this.initialized) await this.initialize();
    
    try {
      // First, delete all video history entries that reference this video
      try {
        await this.db.delete(videoHistory)
          .where(eq(videoHistory.videoId, id));
      } catch (error) {
        console.error(`Error deleting video history records for video ${id}:`, error);
        // Continue with other deletions even if this fails
      }
      
      // Delete any liked video records that reference this video
      try {
        await this.db.delete(likedVideos)
          .where(eq(likedVideos.videoId, id));
      } catch (error) {
        console.error(`Error deleting liked video records for video ${id}:`, error);
        // Continue with other deletions even if this fails
      }
      
      // Delete comments that reference this video
      try {
        await this.db.delete(comments)
          .where(eq(comments.videoId, id));
      } catch (error) {
        console.error(`Error deleting comments for video ${id}:`, error);
        // Continue with other deletions even if this fails
      }
      
      // Finally, delete the video itself
      const result = await this.db.delete(videos)
        .where(eq(videos.id, id))
        .returning({ id: videos.id });
      
      return result.length > 0;
    } catch (error) {
      console.error(`Error deleting video with ID ${id}:`, error);
      return false;
    }
  }

  async incrementVideoViews(id: number): Promise<Video | undefined> {
    if (!this.initialized) await this.initialize();
    
    try {
      const updated = await this.db.update(videos)
        .set({
          views: sql`${videos.views} + 1`,
          updatedAt: new Date()
        })
        .where(eq(videos.id, id))
        .returning();
      
      return updated.length > 0 ? updated[0] : undefined;
    } catch (error) {
      console.error(`Error incrementing views for video with ID ${id}:`, error);
      return undefined;
    }
  }

  async toggleVideoAds(id: number, hasAds: boolean, adUrl?: string, adStartTime?: number, adSkippable?: boolean): Promise<Video | undefined> {
    if (!this.initialized) await this.initialize();
    
    try {
      const updated = await this.db.update(videos)
        .set({
          hasAds,
          adUrl: adUrl || null,
          adStartTime: adStartTime || null,
          adSkippable: adSkippable !== undefined ? adSkippable : true,
          updatedAt: new Date()
        })
        .where(eq(videos.id, id))
        .returning();
      
      return updated.length > 0 ? updated[0] : undefined;
    } catch (error) {
      console.error(`Error toggling ads for video with ID ${id}:`, error);
      return undefined;
    }
  }

  // Comment methods
  
  async getComment(id: number): Promise<Comment | undefined> {
    if (!this.initialized) await this.initialize();
    
    try {
      const result = await this.db.select().from(comments).where(eq(comments.id, id));
      return result.length > 0 ? result[0] : undefined;
    } catch (error) {
      console.error(`Error getting comment with ID ${id}:`, error);
      return undefined;
    }
  }

  async getCommentsByVideo(videoId: number): Promise<Comment[]> {
    if (!this.initialized) await this.initialize();
    
    try {
      return await this.db.select().from(comments)
        .where(eq(comments.videoId, videoId))
        .orderBy(desc(comments.createdAt));
    } catch (error) {
      console.error(`Error getting comments for video with ID ${videoId}:`, error);
      return [];
    }
  }

  async createComment(commentData: InsertComment): Promise<Comment> {
    if (!this.initialized) await this.initialize();
    
    try {
      const inserted = await this.db.insert(comments).values({
        ...commentData,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      return inserted[0];
    } catch (error) {
      console.error('Error creating comment:', error);
      throw error;
    }
  }

  // Subscription methods
  
  async getSubscription(id: number): Promise<Subscription | undefined> {
    if (!this.initialized) await this.initialize();
    
    try {
      const result = await this.db.select().from(subscriptions).where(eq(subscriptions.id, id));
      return result.length > 0 ? result[0] : undefined;
    } catch (error) {
      console.error(`Error getting subscription with ID ${id}:`, error);
      return undefined;
    }
  }

  async getSubscriptionsByUser(userId: number): Promise<Subscription[]> {
    if (!this.initialized) await this.initialize();
    
    try {
      return await this.db.select().from(subscriptions)
        .where(eq(subscriptions.subscriberId, userId));
    } catch (error) {
      console.error(`Error getting subscriptions for user with ID ${userId}:`, error);
      return [];
    }
  }

  async createSubscription(subscriptionData: InsertSubscription): Promise<Subscription> {
    if (!this.initialized) await this.initialize();
    
    try {
      const inserted = await this.db.insert(subscriptions).values({
        ...subscriptionData,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      return inserted[0];
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  }

  // Liked videos methods
  
  async getLikedVideo(id: number): Promise<LikedVideo | undefined> {
    if (!this.initialized) await this.initialize();
    
    try {
      const result = await this.db.select().from(likedVideos).where(eq(likedVideos.id, id));
      return result.length > 0 ? result[0] : undefined;
    } catch (error) {
      console.error(`Error getting liked video with ID ${id}:`, error);
      return undefined;
    }
  }

  async getLikedVideosByUser(userId: number): Promise<LikedVideo[]> {
    if (!this.initialized) await this.initialize();
    
    try {
      return await this.db.select().from(likedVideos)
        .where(eq(likedVideos.userId, userId))
        .orderBy(desc(likedVideos.createdAt));
    } catch (error) {
      console.error(`Error getting liked videos for user with ID ${userId}:`, error);
      return [];
    }
  }

  async createLikedVideo(likedVideoData: InsertLikedVideo): Promise<LikedVideo> {
    if (!this.initialized) await this.initialize();
    
    try {
      const inserted = await this.db.insert(likedVideos).values({
        ...likedVideoData,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      return inserted[0];
    } catch (error) {
      console.error('Error creating liked video:', error);
      throw error;
    }
  }

  // Video history methods
  
  async getVideoHistory(id: number): Promise<VideoHistory | undefined> {
    if (!this.initialized) await this.initialize();
    
    try {
      const result = await this.db.select().from(videoHistory).where(eq(videoHistory.id, id));
      return result.length > 0 ? result[0] : undefined;
    } catch (error) {
      console.error(`Error getting video history with ID ${id}:`, error);
      return undefined;
    }
  }

  async getVideoHistoryByUser(userId: number): Promise<VideoHistory[]> {
    if (!this.initialized) await this.initialize();
    
    try {
      return await this.db.select().from(videoHistory)
        .where(eq(videoHistory.userId, userId))
        .orderBy(desc(videoHistory.createdAt));
    } catch (error) {
      console.error(`Error getting video history for user with ID ${userId}:`, error);
      return [];
    }
  }

  async createVideoHistory(videoHistoryData: InsertVideoHistory): Promise<VideoHistory> {
    if (!this.initialized) await this.initialize();
    
    try {
      const inserted = await this.db.insert(videoHistory).values({
        ...videoHistoryData,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      return inserted[0];
    } catch (error) {
      console.error('Error creating video history:', error);
      throw error;
    }
  }

  // Site settings methods
  
  async getSiteSettings(): Promise<SiteSettings | undefined> {
    // Don't call initialize here to avoid circular dependency
    try {
      const result = await this.db.select().from(siteSettings).limit(1);
      return result.length > 0 ? result[0] : undefined;
    } catch (error) {
      console.error('Error getting site settings:', error);
      return undefined;
    }
  }

  async updateSiteSettings(settings: Partial<SiteSettings>): Promise<SiteSettings> {
    if (!this.initialized) await this.initialize();
    
    try {
      const currentSettings = await this.getSiteSettings();
      
      if (currentSettings) {
        // Update existing settings
        settings.updatedAt = new Date();
        
        const updated = await this.db.update(siteSettings)
          .set(settings)
          .where(eq(siteSettings.id, currentSettings.id))
          .returning();
        
        return updated[0];
      } else {
        // Create new settings
        const newSettings = {
          ...this.defaultSiteSettings,
          ...settings,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        const inserted = await this.db.insert(siteSettings)
          .values(newSettings)
          .returning();
        
        return inserted[0];
      }
    } catch (error) {
      console.error('Error updating site settings:', error);
      throw error;
    }
  }

  // Authentication methods
  
  async authenticateUser(email: string, password: string): Promise<User | undefined> {
    if (!this.initialized) await this.initialize();
    
    try {
      const user = await this.getUserByEmail(email);
      
      if (!user) {
        console.log(`Authentication failed: No user found with email ${email}`);
        return undefined;
      }
      
      const isPasswordValid = this.comparePassword(password, user.password);
      
      if (!isPasswordValid) {
        console.log(`Authentication failed: Invalid password for user ${email}`);
        return undefined;
      }
      
      return user;
    } catch (error) {
      console.error(`Error authenticating user with email ${email}:`, error);
      return undefined;
    }
  }
}
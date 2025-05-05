import { 
  users, User, InsertUser,
  channels, Channel, InsertChannel,
  videos, Video, InsertVideo,
  comments, Comment, InsertComment,
  subscriptions, Subscription, InsertSubscription,
  likedVideos, LikedVideo, InsertLikedVideo,
  videoHistory, VideoHistory, InsertVideoHistory,
  siteSettings, SiteSettings, InsertSiteSettings
} from "@shared/schema";
import { createHash } from "crypto";

// Interface for storage methods
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  
  // Channel methods
  getChannel(id: number): Promise<Channel | undefined>;
  getChannelsByUser(userId: number): Promise<Channel[]>;
  createChannel(channel: InsertChannel): Promise<Channel>;
  updateChannel(id: number, channelData: Partial<Channel>): Promise<Channel | undefined>;
  
  // Video methods
  getVideo(id: number): Promise<Video | undefined>;
  getVideos(limit?: number, offset?: number): Promise<Video[]>;
  getVideosByUser(userId: number): Promise<Video[]>;
  getRecentVideos(limit?: number): Promise<Video[]>;
  getTrendingVideos(limit?: number): Promise<Video[]>;
  getQuickies(limit?: number): Promise<Video[]>;
  createVideo(video: InsertVideo): Promise<Video>;
  updateVideo(id: number, videoData: Partial<Video>): Promise<Video | undefined>;
  deleteVideo(id: number): Promise<boolean>;
  incrementVideoViews(id: number): Promise<Video | undefined>;
  toggleVideoAds(id: number, hasAds: boolean, adUrl?: string, adStartTime?: number, adSkippable?: boolean): Promise<Video | undefined>;
  
  // Comment methods
  getComment(id: number): Promise<Comment | undefined>;
  getCommentsByVideo(videoId: number): Promise<Comment[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  
  // Subscription methods
  getSubscription(id: number): Promise<Subscription | undefined>;
  getSubscriptionsByUser(userId: number): Promise<Subscription[]>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  
  // Liked videos methods
  getLikedVideo(id: number): Promise<LikedVideo | undefined>;
  getLikedVideosByUser(userId: number): Promise<LikedVideo[]>;
  createLikedVideo(likedVideo: InsertLikedVideo): Promise<LikedVideo>;
  
  // Video history methods
  getVideoHistory(id: number): Promise<VideoHistory | undefined>;
  getVideoHistoryByUser(userId: number): Promise<VideoHistory[]>;
  createVideoHistory(videoHistory: InsertVideoHistory): Promise<VideoHistory>;
  deleteVideoHistory?(id: number): Promise<boolean>;
  clearVideoHistoryByUser?(userId: number): Promise<boolean>;
  
  // Site settings methods
  getSiteSettings(): Promise<SiteSettings | undefined>;
  updateSiteSettings(settings: Partial<SiteSettings>): Promise<SiteSettings>;
  
  // Authentication methods
  authenticateUser(email: string, password: string): Promise<User | undefined>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private channels: Map<number, Channel>;
  private videos: Map<number, Video>;
  private comments: Map<number, Comment>;
  private subscriptions: Map<number, Subscription>;
  private likedVideos: Map<number, LikedVideo>;
  private videoHistory: Map<number, VideoHistory>;
  
  // IDs for auto-increment
  private userIdCounter: number;
  private channelIdCounter: number;
  private videoIdCounter: number;
  private commentIdCounter: number;
  private subscriptionIdCounter: number;
  private likedVideoIdCounter: number;
  private videoHistoryIdCounter: number;
  private siteSettings: SiteSettings;
  
  constructor() {
    this.users = new Map();
    this.channels = new Map();
    this.videos = new Map();
    this.comments = new Map();
    this.subscriptions = new Map();
    this.likedVideos = new Map();
    this.videoHistory = new Map();
    
    this.userIdCounter = 1;
    this.channelIdCounter = 1;
    this.videoIdCounter = 1;
    this.commentIdCounter = 1;
    this.subscriptionIdCounter = 1;
    this.likedVideoIdCounter = 1;
    this.videoHistoryIdCounter = 1;
    
    // Initialize site settings
    this.siteSettings = {
      id: 1,
      siteAdsEnabled: false,
      siteAdUrls: [],
      siteAdPositions: [],
      introVideoEnabled: false,
      introVideoUrl: '',
      introVideoDuration: 0,
      updatedAt: new Date()
    };
    
    // Add sample data
    this.initializeSampleData();
  }
  
  // Site settings methods
  async getSiteSettings(): Promise<SiteSettings | undefined> {
    return this.siteSettings;
  }
  
  async updateSiteSettings(settings: Partial<SiteSettings>): Promise<SiteSettings> {
    this.siteSettings = {
      ...this.siteSettings,
      ...settings,
      updatedAt: new Date()
    };
    return this.siteSettings;
  }
  
  // Helper methods for password hashing
  private hashPassword(password: string): string {
    return createHash('sha256').update(password).digest('hex');
  }
  
  private comparePassword(password: string, hashedPassword: string): boolean {
    return this.hashPassword(password) === hashedPassword;
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase()
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const hashedPassword = this.hashPassword(insertUser.password);
    const user: User = {
      ...insertUser,
      id,
      password: hashedPassword,
      isAdmin: false,
      subscriberCount: 0
    };
    this.users.set(id, user);
    
    // Automatically create a channel for the user
    await this.createChannel({
      userId: user.id,
      name: user.username,
      description: `${user.username}'s channel`,
      bannerImage: ''
    });
    
    return user;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  // Channel methods
  async getChannel(id: number): Promise<Channel | undefined> {
    return this.channels.get(id);
  }
  
  async getChannelsByUser(userId: number): Promise<Channel[]> {
    return Array.from(this.channels.values()).filter(
      (channel) => channel.userId === userId
    );
  }
  
  async createChannel(insertChannel: InsertChannel): Promise<Channel> {
    const id = this.channelIdCounter++;
    const now = new Date();
    const channel: Channel = {
      ...insertChannel,
      id,
      createdAt: now
    };
    this.channels.set(id, channel);
    return channel;
  }

  async updateChannel(id: number, channelData: Partial<Channel>): Promise<Channel | undefined> {
    const channel = await this.getChannel(id);
    if (!channel) return undefined;
    
    const updatedChannel = { ...channel, ...channelData };
    this.channels.set(id, updatedChannel);
    return updatedChannel;
  }
  
  // Video methods
  async getVideo(id: number): Promise<Video | undefined> {
    return this.videos.get(id);
  }
  
  async getVideos(limit = 50, offset = 0): Promise<Video[]> {
    return Array.from(this.videos.values())
      // Show all videos - removed filter for isPublished
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(offset, offset + limit);
  }
  
  async getVideosByUser(userId: number): Promise<Video[]> {
    return Array.from(this.videos.values())
      .filter((video) => video.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  async getRecentVideos(limit = 8): Promise<Video[]> {
    return Array.from(this.videos.values())
      // Show all non-quickie videos
      .filter(video => !video.isQuickie)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }
  
  async getTrendingVideos(limit = 8): Promise<Video[]> {
    return Array.from(this.videos.values())
      // Show all non-quickie videos
      .filter(video => !video.isQuickie)
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, limit);
  }
  
  async getQuickies(limit = 12): Promise<Video[]> {
    return Array.from(this.videos.values())
      // Show all quickie videos
      .filter((video) => video.isQuickie)
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, limit);
  }
  
  async createVideo(insertVideo: InsertVideo): Promise<Video> {
    const id = this.videoIdCounter++;
    const now = new Date();
    const video: Video = {
      ...insertVideo,
      id,
      views: 0,
      likes: 0,
      dislikes: 0,
      createdAt: now
    };
    this.videos.set(id, video);
    return video;
  }
  
  async updateVideo(id: number, videoData: Partial<Video>): Promise<Video | undefined> {
    const video = await this.getVideo(id);
    if (!video) return undefined;
    
    const updatedVideo = { ...video, ...videoData };
    this.videos.set(id, updatedVideo);
    return updatedVideo;
  }
  
  async deleteVideo(id: number): Promise<boolean> {
    const video = await this.getVideo(id);
    if (!video) return false;
    
    // Delete video from storage
    this.videos.delete(id);
    
    // Delete related comments
    const videoComments = await this.getCommentsByVideo(id);
    for (const comment of videoComments) {
      this.comments.delete(comment.id);
    }
    
    // Delete related likes
    const likedVideos = Array.from(this.likedVideos.values())
      .filter(like => like.videoId === id);
    for (const like of likedVideos) {
      this.likedVideos.delete(like.id);
    }
    
    // Delete from watch history
    const historyEntries = Array.from(this.videoHistory.values())
      .filter(history => history.videoId === id);
    for (const entry of historyEntries) {
      this.videoHistory.delete(entry.id);
    }
    
    return true;
  }
  
  async incrementVideoViews(id: number): Promise<Video | undefined> {
    const video = await this.getVideo(id);
    if (!video) return undefined;
    
    const updatedVideo = { ...video, views: video.views + 1 };
    this.videos.set(id, updatedVideo);
    return updatedVideo;
  }

  async toggleVideoAds(id: number, hasAds: boolean, adUrl?: string, adStartTime?: number, adSkippable?: boolean): Promise<Video | undefined> {
    const video = await this.getVideo(id);
    if (!video) return undefined;
    
    const updatedVideo = { 
      ...video, 
      hasAds,
      adUrl: hasAds ? (adUrl || video.adUrl) : null,
      adStartTime: hasAds ? (adStartTime || video.adStartTime) : null,
      adSkippable: hasAds ? (adSkippable !== undefined ? adSkippable : video.adSkippable) : true
    };
    
    this.videos.set(id, updatedVideo);
    return updatedVideo;
  }
  
  // Comment methods
  async getComment(id: number): Promise<Comment | undefined> {
    return this.comments.get(id);
  }
  
  async getCommentsByVideo(videoId: number): Promise<Comment[]> {
    return Array.from(this.comments.values())
      .filter((comment) => comment.videoId === videoId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  async createComment(insertComment: InsertComment): Promise<Comment> {
    const id = this.commentIdCounter++;
    const now = new Date();
    const comment: Comment = {
      ...insertComment,
      id,
      likes: 0,
      createdAt: now
    };
    this.comments.set(id, comment);
    return comment;
  }
  
  // Subscription methods
  async getSubscription(id: number): Promise<Subscription | undefined> {
    return this.subscriptions.get(id);
  }
  
  async getSubscriptionsByUser(userId: number): Promise<Subscription[]> {
    return Array.from(this.subscriptions.values())
      .filter((subscription) => subscription.subscriberId === userId);
  }
  
  async createSubscription(insertSubscription: InsertSubscription): Promise<Subscription> {
    const id = this.subscriptionIdCounter++;
    const now = new Date();
    const subscription: Subscription = {
      ...insertSubscription,
      id,
      createdAt: now
    };
    this.subscriptions.set(id, subscription);
    
    // Update subscriber count for the channel owner
    const channel = await this.getChannel(insertSubscription.channelId);
    if (channel) {
      const channelOwner = await this.getUser(channel.userId);
      if (channelOwner) {
        await this.updateUser(channelOwner.id, {
          subscriberCount: (channelOwner.subscriberCount || 0) + 1
        });
      }
    }
    
    return subscription;
  }
  
  // Liked videos methods
  async getLikedVideo(id: number): Promise<LikedVideo | undefined> {
    return this.likedVideos.get(id);
  }
  
  async getLikedVideosByUser(userId: number): Promise<LikedVideo[]> {
    return Array.from(this.likedVideos.values())
      .filter((likedVideo) => likedVideo.userId === userId);
  }
  
  async createLikedVideo(insertLikedVideo: InsertLikedVideo): Promise<LikedVideo> {
    const id = this.likedVideoIdCounter++;
    const now = new Date();
    const likedVideo: LikedVideo = {
      ...insertLikedVideo,
      id,
      createdAt: now
    };
    this.likedVideos.set(id, likedVideo);
    
    // Increment likes on the video
    const video = await this.getVideo(insertLikedVideo.videoId);
    if (video) {
      await this.updateVideo(video.id, { likes: video.likes + 1 });
    }
    
    return likedVideo;
  }
  
  // Video history methods
  async getVideoHistory(id: number): Promise<VideoHistory | undefined> {
    return this.videoHistory.get(id);
  }
  
  async getVideoHistoryByUser(userId: number): Promise<VideoHistory[]> {
    return Array.from(this.videoHistory.values())
      .filter((history) => history.userId === userId)
      .sort((a, b) => new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime());
  }
  
  async createVideoHistory(insertVideoHistory: InsertVideoHistory): Promise<VideoHistory> {
    const id = this.videoHistoryIdCounter++;
    const now = new Date();
    const videoHistory: VideoHistory = {
      ...insertVideoHistory,
      id,
      watchedAt: now
    };
    this.videoHistory.set(id, videoHistory);
    return videoHistory;
  }
  
  async deleteVideoHistory(id: number): Promise<boolean> {
    const history = await this.getVideoHistory(id);
    if (!history) return false;
    this.videoHistory.delete(id);
    return true;
  }
  
  async clearVideoHistoryByUser(userId: number): Promise<boolean> {
    const historyItems = await this.getVideoHistoryByUser(userId);
    for (const item of historyItems) {
      this.videoHistory.delete(item.id);
    }
    return true;
  }
  
  // Authentication methods
  async authenticateUser(email: string, password: string): Promise<User | undefined> {
    const user = await this.getUserByEmail(email);
    if (!user) return undefined;
    
    if (this.comparePassword(password, user.password)) {
      return { ...user, password: '[REDACTED]' } as User;
    }
    
    return undefined;
  }
  
  // Initialize sample data
  private async initializeSampleData() {
    // Create admin user only (no sample content)
    const adminUser = await this.createUser({
      username: 'admin',
      password: '@Manohar596',
      email: 'm.manohar2003@gmail.com',
      displayName: 'Site Admin',
      profileImage: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=100&h=100',
      bio: 'Site administrator',
    });
    
    // Set admin privileges
    await this.updateUser(adminUser.id, { isAdmin: true });
    
    // Set default site settings
    await this.updateSiteSettings({
      siteName: 'XPlayHD',
      allowsAds: true,
      defaultAdUrl: '',
      adStartTime: 5
    });
  }
  
  private async updateComment(id: number, data: Partial<Comment>): Promise<Comment | undefined> {
    const comment = await this.getComment(id);
    if (!comment) return undefined;
    
    const updatedComment = { ...comment, ...data };
    this.comments.set(id, updatedComment);
    return updatedComment;
  }
}

// Create an in-memory storage instance
export const memStorage = new MemStorage();

// Set default PostgreSQL as the storage provider
console.log('----------------------');
console.log('Storage selection: Using PostgreSQL storage');
console.log('----------------------');

// Import the PostgreSQL storage implementation
import { PostgresDBStorage } from './postgresDBStorage';

// Create and export the PostgreSQL storage instance
export const postgresDBStorage = new PostgresDBStorage();

// Export the default storage to use throughout the application
export const storage = postgresDBStorage;

import { 
  users, User, InsertUser,
  channels, Channel, InsertChannel,
  videos, Video, InsertVideo,
  comments, Comment, InsertComment,
  subscriptions, Subscription, InsertSubscription,
  likedVideos, LikedVideo, InsertLikedVideo,
  videoHistory, VideoHistory, InsertVideoHistory
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
  toggleVideoAds(id: number, hasAds: boolean, adUrl?: string, adStartTime?: number): Promise<Video | undefined>;
  
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
      .filter(video => video.isPublished)
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
      .filter(video => video.isPublished && !video.isQuickie)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }
  
  async getTrendingVideos(limit = 8): Promise<Video[]> {
    return Array.from(this.videos.values())
      .filter(video => video.isPublished && !video.isQuickie)
      .sort((a, b) => b.views - a.views)
      .slice(0, limit);
  }
  
  async getQuickies(limit = 12): Promise<Video[]> {
    return Array.from(this.videos.values())
      .filter((video) => video.isPublished && video.isQuickie)
      .sort((a, b) => b.views - a.views)
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

  async toggleVideoAds(id: number, hasAds: boolean, adUrl?: string, adStartTime?: number): Promise<Video | undefined> {
    const video = await this.getVideo(id);
    if (!video) return undefined;
    
    const updatedVideo = { 
      ...video, 
      hasAds,
      adUrl: hasAds ? (adUrl || video.adUrl) : null,
      adStartTime: hasAds ? (adStartTime || video.adStartTime) : null
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
    // Create admin user
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
    
    // Create sample users
    const user1 = await this.createUser({
      username: 'sophia_luxe',
      password: 'password123',
      email: 'sophia@example.com',
      displayName: 'Sophia Luxe',
      profileImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&h=100',
      bio: 'Professional adult content creator with a passion for quality production',
    });
    
    const user2 = await this.createUser({
      username: 'ruby_passion',
      password: 'password123',
      email: 'ruby@example.com',
      displayName: 'Ruby Passion',
      profileImage: 'https://images.unsplash.com/photo-1522556189639-b150ed9c4330?auto=format&fit=crop&w=100&h=100',
      bio: 'Redhead beauty bringing your fantasies to life',
    });
    
    const user3 = await this.createUser({
      username: 'elite_fantasies',
      password: 'password123',
      email: 'elite@example.com',
      displayName: 'Elite Fantasies',
      profileImage: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=100&h=100',
      bio: 'Premium adult content that exceeds your expectations',
    });
    
    const user4 = await this.createUser({
      username: 'tropical_desires',
      password: 'password123',
      email: 'tropical@example.com',
      displayName: 'Tropical Desires',
      profileImage: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=100&h=100',
      bio: 'Bringing the heat from exotic locations',
    });
    
    // Create sample videos
    await this.createVideo({
      userId: user1.id,
      title: 'Hot Summer Adventures with Stunning Blonde',
      description: 'Join me for a day at the beach that turns into something more exciting',
      filePath: '/videos/sample1.mp4',
      thumbnailPath: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=480&h=270',
      duration: 765, // 12:45 in seconds
      category: 'Professional',
      tags: ['beach', 'blonde', 'summer'],
      isPublished: true,
      isQuickie: false,
    });
    
    await this.createVideo({
      userId: user2.id,
      title: 'Intimate Evening with a Redhead Beauty',
      description: 'A romantic evening that turns into a passionate night',
      filePath: '/videos/sample2.mp4',
      thumbnailPath: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=480&h=270',
      duration: 512, // 8:32 in seconds
      category: 'Amateur',
      tags: ['redhead', 'evening', 'romantic'],
      isPublished: true,
      isQuickie: false,
    });
    
    await this.createVideo({
      userId: user3.id,
      title: 'Passionate Encounter in Luxury Hotel Suite',
      description: 'Experience what happens when luxury meets passion',
      filePath: '/videos/sample3.mp4',
      thumbnailPath: 'https://images.unsplash.com/photo-1543599538-a6c4f6cc5c05?auto=format&fit=crop&w=480&h=270',
      duration: 1198, // 19:58 in seconds
      category: 'Professional',
      tags: ['luxury', 'hotel', 'encounter'],
      isPublished: true,
      isQuickie: false,
    });
    
    await this.createVideo({
      userId: user4.id,
      title: 'Exotic Beach Romance at Sunset',
      description: 'Watch what happens as the sun goes down on a private beach',
      filePath: '/videos/sample4.mp4',
      thumbnailPath: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=480&h=270',
      duration: 1634, // 27:14 in seconds
      category: 'Professional',
      tags: ['beach', 'sunset', 'exotic'],
      isPublished: true,
      isQuickie: false,
    });
    
    await this.createVideo({
      userId: user1.id,
      title: 'First Time Experience with Two Partners',
      description: 'Watch my exciting first time with multiple partners',
      filePath: '/videos/sample5.mp4',
      thumbnailPath: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=480&h=270',
      duration: 862, // 14:22 in seconds
      category: 'Amateur',
      tags: ['threesome', 'first time', 'adventure'],
      isPublished: true,
      isQuickie: false,
    });
    
    await this.createVideo({
      userId: user2.id,
      title: 'Office Fantasy with the New Secretary',
      description: 'Workplace fantasy turns into reality after hours',
      filePath: '/videos/sample6.mp4',
      thumbnailPath: 'https://images.unsplash.com/photo-1533461502717-83546f485d24?auto=format&fit=crop&w=480&h=270',
      duration: 1296, // 21:36 in seconds
      category: 'Professional',
      tags: ['office', 'secretary', 'roleplay'],
      isPublished: true,
      isQuickie: false,
    });
    
    await this.createVideo({
      userId: user3.id,
      title: 'Yoga Instructor After Hours Sessions',
      description: 'Private yoga lessons that turn into something more flexible',
      filePath: '/videos/sample7.mp4',
      thumbnailPath: 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=480&h=270',
      duration: 948, // 15:48 in seconds
      category: 'Professional',
      tags: ['yoga', 'fitness', 'instructor'],
      isPublished: true,
      isQuickie: false,
    });
    
    await this.createVideo({
      userId: user4.id,
      title: 'Intimate Massage Therapy Session',
      description: 'A relaxing massage turns passionate',
      filePath: '/videos/sample8.mp4',
      thumbnailPath: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=480&h=270',
      duration: 1089, // 18:09 in seconds
      category: 'Professional',
      tags: ['massage', 'relaxing', 'sensual'],
      isPublished: true,
      isQuickie: false,
    });
    
    // Create sample quickies (short videos)
    await this.createVideo({
      userId: user1.id,
      title: 'Quick Tease in Red Lingerie',
      description: 'A short and sweet teaser in my new outfit',
      filePath: '/videos/quickie1.mp4',
      thumbnailPath: 'https://images.unsplash.com/photo-1617575452143-af7aed9163c0?auto=format&fit=crop&w=240&h=427',
      duration: 45,
      category: 'Quickie',
      tags: ['lingerie', 'tease', 'red'],
      isPublished: true,
      isQuickie: true,
    });
    
    await this.createVideo({
      userId: user2.id,
      title: 'Playful Shower Moments',
      description: 'Catching some fun moments in the shower',
      filePath: '/videos/quickie2.mp4',
      thumbnailPath: 'https://images.unsplash.com/photo-1613323593608-abc90fec84ff?auto=format&fit=crop&w=240&h=427',
      duration: 32,
      category: 'Quickie',
      tags: ['shower', 'playful', 'water'],
      isPublished: true,
      isQuickie: true,
    });
    
    await this.createVideo({
      userId: user3.id,
      title: 'Late Night Hotel Tease',
      description: 'A little preview of what happens in hotel rooms',
      filePath: '/videos/quickie3.mp4',
      thumbnailPath: 'https://images.unsplash.com/photo-1542295669297-4d352cc77abb?auto=format&fit=crop&w=240&h=427',
      duration: 58,
      category: 'Quickie',
      tags: ['hotel', 'night', 'tease'],
      isPublished: true,
      isQuickie: true,
    });
    
    await this.createVideo({
      userId: user4.id,
      title: 'Poolside Flirting',
      description: 'Flirty moments by the pool on vacation',
      filePath: '/videos/quickie4.mp4',
      thumbnailPath: 'https://images.unsplash.com/photo-1516522973472-f009f23bba59?auto=format&fit=crop&w=240&h=427',
      duration: 41,
      category: 'Quickie',
      tags: ['pool', 'vacation', 'bikini'],
      isPublished: true,
      isQuickie: true,
    });
    
    await this.createVideo({
      userId: user1.id,
      title: 'Morning Coffee Surprise',
      description: 'How I like to start my mornings',
      filePath: '/videos/quickie5.mp4',
      thumbnailPath: 'https://images.unsplash.com/photo-1527203561188-dae1bc1a417f?auto=format&fit=crop&w=240&h=427',
      duration: 38,
      category: 'Quickie',
      tags: ['morning', 'coffee', 'surprise'],
      isPublished: true,
      isQuickie: true,
    });
    
    // Create sample comments
    await this.createComment({
      videoId: 1,
      userId: 2,
      content: 'Sophia is absolutely stunning in this video! The beach scenes were incredible. Can\'t wait to see more content like this!'
    });
    
    await this.createComment({
      videoId: 1,
      userId: 3,
      content: 'The production quality on this is incredible! I\'ve subscribed to your premium channel after seeing this.'
    });
    
    await this.createComment({
      videoId: 1,
      userId: 1,
      content: 'Thanks for all the love on this video! I\'m planning a sequel for next month. Make sure to subscribe so you don\'t miss it! ❤️'
    });
    
    // Add views, likes, etc.
    await this.updateVideo(1, { views: 1200000, likes: 24000, dislikes: 1000 });
    await this.updateVideo(2, { views: 847000, likes: 18000, dislikes: 800 });
    await this.updateVideo(3, { views: 2500000, likes: 37000, dislikes: 1500 });
    await this.updateVideo(4, { views: 1800000, likes: 29000, dislikes: 1200 });
    await this.updateVideo(5, { views: 4700000, likes: 58000, dislikes: 2000 });
    await this.updateVideo(6, { views: 3900000, likes: 42000, dislikes: 1800 });
    await this.updateVideo(7, { views: 2300000, likes: 32000, dislikes: 1100 });
    await this.updateVideo(8, { views: 3100000, likes: 38000, dislikes: 1400 });
    await this.updateVideo(9, { views: 3200000, likes: 41000, dislikes: 900 });
    await this.updateVideo(10, { views: 1700000, likes: 25000, dislikes: 700 });
    await this.updateVideo(11, { views: 4500000, likes: 62000, dislikes: 1900 });
    await this.updateVideo(12, { views: 2800000, likes: 36000, dislikes: 1300 });
    await this.updateVideo(13, { views: 1900000, likes: 28000, dislikes: 1100 });
    
    // Update comment likes
    await this.updateComment(1, { likes: 346 });
    await this.updateComment(2, { likes: 214 });
    await this.updateComment(3, { likes: 528 });
  }
  
  private async updateComment(id: number, data: Partial<Comment>): Promise<Comment | undefined> {
    const comment = await this.getComment(id);
    if (!comment) return undefined;
    
    const updatedComment = { ...comment, ...data };
    this.comments.set(id, updatedComment);
    return updatedComment;
  }
}

import { dynamoDBStorage } from './dynamoDBStorage';

// Determine which storage to use based on environment variables
const USE_DYNAMODB = process.env.USE_DYNAMODB === 'true';

// Create and export the appropriate storage
export const storage = USE_DYNAMODB ? dynamoDBStorage : new MemStorage();

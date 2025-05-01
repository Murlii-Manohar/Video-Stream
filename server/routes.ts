import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  loginSchema, 
  registerSchema, 
  insertVideoSchema, 
  insertCommentSchema, 
  insertSubscriptionSchema,
  insertLikedVideoSchema,
  sendVerificationSchema,
  verifyEmailSchema
} from "@shared/schema";
import fs from "fs";
import path from "path";
import multer from "multer";
import { ZodError } from "zod";
import session from "express-session";
import MemoryStore from "memorystore";
import { initializeEmailService, sendVerificationEmail, verifyCode } from "./services/emailService";

// Create a memory store for sessions
const SessionStore = MemoryStore(session);

// Initialize email service
initializeEmailService();

// Setup file storage for video uploads
const storage_dir = path.resolve(process.cwd(), "uploaded_files");
if (!fs.existsSync(storage_dir)) {
  fs.mkdirSync(storage_dir, { recursive: true });
}

const storage_handler = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, storage_dir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Different prefix based on file type
    const prefix = file.fieldname === 'videoFile' ? 'video-' : 'thumbnail-';
    cb(null, prefix + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req: any, file: any, cb: any) => {
  if (file.fieldname === 'videoFile') {
    // Accept video files only for videoFile field
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed for video upload'));
    }
  } else if (file.fieldname === 'thumbnailFile') {
    // Accept image files only for thumbnailFile field
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for thumbnail'));
    }
  } else {
    // Reject any other fields
    cb(new Error('Unexpected field'));
  }
};

const upload = multer({ 
  storage: storage_handler,
  limits: {
    fileSize: 5 * 1024 * 1024 * 1024, // 5GB limit for videos
  },
  fileFilter: fileFilter
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session middleware
  app.use(session({
    store: new SessionStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    secret: process.env.SESSION_SECRET || 'xplayhd-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week
    }
  }));

  // Middleware to handle validation errors
  const handleValidation = (schema: any) => async (req: Request, res: Response, next: any) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      next(error);
    }
  };

  // Authentication middleware
  const requireAuth = (req: Request, res: Response, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    next();
  };
  
  // Admin middleware
  const requireAdmin = async (req: Request, res: Response, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Fetch the user to check if they're an admin
    const user = await storage.getUser(req.session.userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    
    next();
  };

  // Serve uploaded files
  app.use('/uploads', express.static(storage_dir));

  // Email Verification Routes
  app.post('/api/auth/send-verification', handleValidation(sendVerificationSchema), async (req, res) => {
    try {
      const { email } = req.body;
      
      // Check if user with email already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }
      
      // Send verification code
      const verificationCode = await sendVerificationEmail(email);
      
      res.json({ message: 'Verification code sent successfully' });
    } catch (error) {
      console.error('Send verification error:', error);
      res.status(500).json({ message: 'Failed to send verification code' });
    }
  });
  
  app.post('/api/auth/verify-email', handleValidation(verifyEmailSchema), async (req, res) => {
    try {
      const { email, code } = req.body;
      
      // Verify the code
      const isVerified = verifyCode(email, code);
      
      if (!isVerified) {
        return res.status(400).json({ message: 'Invalid or expired verification code' });
      }
      
      res.json({ message: 'Email verified successfully', verified: true });
    } catch (error) {
      console.error('Verify email error:', error);
      res.status(500).json({ message: 'Failed to verify email' });
    }
  });

  // Authentication Routes
  app.post('/api/auth/register', handleValidation(registerSchema), async (req, res) => {
    try {
      const { confirmPassword, ...userData } = req.body;
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }
      
      const existingUsername = await storage.getUserByUsername(userData.username);
      if (existingUsername) {
        return res.status(400).json({ message: 'Username is already taken' });
      }
      
      // Create the user
      const user = await storage.createUser(userData);
      
      // Store user id in session
      req.session.userId = user.id;
      
      res.status(201).json({
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Server error during registration' });
    }
  });

  app.post('/api/auth/login', handleValidation(loginSchema), async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const user = await storage.authenticateUser(email, password);
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      
      // Store user id in session
      req.session.userId = user.id;
      
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        profileImage: user.profileImage,
        isAdmin: user.isAdmin,
        isBanned: user.isBanned
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Server error during login' });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: 'Failed to logout' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  });

  app.get('/api/auth/me', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        req.session.destroy(() => {});
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        profileImage: user.profileImage,
        bio: user.bio,
        subscriberCount: user.subscriberCount,
        isAdmin: user.isAdmin,
        isBanned: user.isBanned
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Video Routes
  app.get('/api/videos', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      
      const videos = await storage.getVideos(limit, offset);
      
      // Fetch creator info for each video
      const videosWithCreator = await Promise.all(videos.map(async (video) => {
        const creator = await storage.getUser(video.userId);
        return {
          ...video,
          creator: creator ? {
            id: creator.id,
            username: creator.username,
            displayName: creator.displayName,
            profileImage: creator.profileImage
          } : null
        };
      }));
      
      res.json(videosWithCreator);
    } catch (error) {
      console.error('Get videos error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/videos/recent', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 8;
      
      const videos = await storage.getRecentVideos(limit);
      
      // Fetch creator info for each video
      const videosWithCreator = await Promise.all(videos.map(async (video) => {
        const creator = await storage.getUser(video.userId);
        return {
          ...video,
          creator: creator ? {
            id: creator.id,
            username: creator.username,
            displayName: creator.displayName,
            profileImage: creator.profileImage
          } : null
        };
      }));
      
      res.json(videosWithCreator);
    } catch (error) {
      console.error('Get recent videos error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/videos/trending', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 8;
      
      const videos = await storage.getTrendingVideos(limit);
      
      // Fetch creator info for each video
      const videosWithCreator = await Promise.all(videos.map(async (video) => {
        const creator = await storage.getUser(video.userId);
        return {
          ...video,
          creator: creator ? {
            id: creator.id,
            username: creator.username,
            displayName: creator.displayName,
            profileImage: creator.profileImage
          } : null
        };
      }));
      
      res.json(videosWithCreator);
    } catch (error) {
      console.error('Get trending videos error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/videos/quickies', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 12;
      
      const videos = await storage.getQuickies(limit);
      
      // Fetch creator info for each video
      const videosWithCreator = await Promise.all(videos.map(async (video) => {
        const creator = await storage.getUser(video.userId);
        return {
          ...video,
          creator: creator ? {
            id: creator.id,
            username: creator.username,
            displayName: creator.displayName,
            profileImage: creator.profileImage
          } : null
        };
      }));
      
      res.json(videosWithCreator);
    } catch (error) {
      console.error('Get quickies error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/videos/:id', async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const video = await storage.getVideo(videoId);
      
      if (!video) {
        return res.status(404).json({ message: 'Video not found' });
      }
      
      // Increment view count
      await storage.incrementVideoViews(videoId);
      
      // Add to watch history if user is logged in
      if (req.session.userId) {
        await storage.createVideoHistory({
          userId: req.session.userId,
          videoId
        });
      }
      
      // Get creator info
      const creator = await storage.getUser(video.userId);
      
      res.json({
        ...video,
        creator: creator ? {
          id: creator.id,
          username: creator.username,
          displayName: creator.displayName,
          profileImage: creator.profileImage,
          subscriberCount: creator.subscriberCount
        } : null
      });
    } catch (error) {
      console.error('Get video error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/videos', requireAuth, upload.fields([
    { name: 'videoFile', maxCount: 1 },
    { name: 'thumbnailFile', maxCount: 1 }
  ]), handleValidation(insertVideoSchema), async (req, res) => {
    try {
      const userId = req.session.userId as number;
      
      // Cast req.files to the correct type
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      // Check if video file was uploaded
      if (!files || !files['videoFile'] || files['videoFile'].length === 0) {
        return res.status(400).json({ message: 'No video file uploaded' });
      }
      
      const videoFile = files['videoFile'][0];
      let thumbnailPath = '';
      
      // Check if thumbnail was uploaded
      if (files['thumbnailFile'] && files['thumbnailFile'].length > 0) {
        const thumbnailFile = files['thumbnailFile'][0];
        thumbnailPath = `/uploads/${thumbnailFile.filename}`;
      }
      
      // Parse categories from JSON string if present
      let categories = [];
      if (req.body.categories) {
        try {
          categories = JSON.parse(req.body.categories);
        } catch (e) {
          console.error('Failed to parse categories:', e);
        }
      }
      
      const videoData = {
        ...req.body,
        userId,
        filePath: `/uploads/${videoFile.filename}`,
        thumbnailPath: thumbnailPath,
        categories: categories,
        tags: req.body.tags ? req.body.tags.split(',').map((tag: string) => tag.trim()) : []
      };
      
      const video = await storage.createVideo(videoData);
      
      res.status(201).json(video);
    } catch (error) {
      console.error('Upload video error:', error);
      res.status(500).json({ message: 'Server error during video upload' });
    }
  });

  // Comment Routes
  app.get('/api/videos/:id/comments', async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      
      const comments = await storage.getCommentsByVideo(videoId);
      
      // Get user info for each comment
      const commentsWithUser = await Promise.all(comments.map(async (comment) => {
        const user = await storage.getUser(comment.userId);
        return {
          ...comment,
          user: user ? {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            profileImage: user.profileImage
          } : null
        };
      }));
      
      res.json(commentsWithUser);
    } catch (error) {
      console.error('Get comments error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/videos/:id/comments', requireAuth, handleValidation(insertCommentSchema), async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const userId = req.session.userId as number;
      
      const commentData = {
        videoId,
        userId,
        content: req.body.content
      };
      
      const comment = await storage.createComment(commentData);
      
      // Get user info
      const user = await storage.getUser(userId);
      
      res.status(201).json({
        ...comment,
        user: {
          id: user!.id,
          username: user!.username,
          displayName: user!.displayName,
          profileImage: user!.profileImage
        }
      });
    } catch (error) {
      console.error('Add comment error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Channel Routes
  // Get user's channels
  app.get('/api/channels/user', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      
      const channels = await storage.getChannelsByUser(userId);
      res.json(channels);
    } catch (error) {
      console.error('Get user channels error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Get specific channel
  app.get('/api/channels/:channelId', async (req, res) => {
    try {
      const channelId = parseInt(req.params.channelId);
      
      const channel = await storage.getChannel(channelId);
      if (!channel) {
        return res.status(404).json({ message: 'Channel not found' });
      }
      
      const user = await storage.getUser(channel.userId);
      
      res.json({
        ...channel,
        user: user ? {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          profileImage: user.profileImage,
          subscriberCount: user.subscriberCount
        } : null
      });
    } catch (error) {
      console.error('Get channel error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get channel by user ID (for backward compatibility)
  app.get('/api/channels/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      const channels = await storage.getChannelsByUser(userId);
      if (!channels.length) {
        return res.status(404).json({ message: 'Channel not found' });
      }
      
      const user = await storage.getUser(userId);
      
      res.json({
        ...channels[0],
        user: user ? {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          profileImage: user.profileImage,
          subscriberCount: user.subscriberCount
        } : null
      });
    } catch (error) {
      console.error('Get channel error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Create a new channel
  app.post('/api/channels', requireAuth, upload.single('bannerImage'), async (req, res) => {
    try {
      const userId = req.session.userId as number;
      
      // Handle banner image upload
      let bannerImagePath = '';
      if (req.file) {
        bannerImagePath = `/uploads/${req.file.filename}`;
      } else if (req.body.bannerImageUrl) {
        bannerImagePath = req.body.bannerImageUrl;
      }
      
      const channelData = {
        userId: userId,
        name: req.body.name,
        description: req.body.description || null,
        bannerImage: bannerImagePath || null
      };
      
      const channel = await storage.createChannel(channelData);
      
      res.status(201).json(channel);
    } catch (error) {
      console.error('Create channel error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Update channel
  app.patch('/api/channels/:channelId', requireAuth, upload.single('bannerImage'), async (req, res) => {
    try {
      const userId = req.session.userId as number;
      const channelId = parseInt(req.params.channelId);
      
      // Verify channel ownership
      const channel = await storage.getChannel(channelId);
      if (!channel) {
        return res.status(404).json({ message: 'Channel not found' });
      }
      
      if (channel.userId !== userId) {
        return res.status(403).json({ message: 'Not authorized to update this channel' });
      }
      
      // Handle banner image upload
      let updateData: any = {
        name: req.body.name,
        description: req.body.description || null
      };
      
      if (req.file) {
        updateData.bannerImage = `/uploads/${req.file.filename}`;
      } else if (req.body.bannerImageUrl) {
        updateData.bannerImage = req.body.bannerImageUrl;
      }
      
      const updatedChannel = await storage.updateChannel(channelId, updateData);
      
      res.json(updatedChannel);
    } catch (error) {
      console.error('Update channel error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Subscription Routes
  app.post('/api/subscriptions', requireAuth, handleValidation(insertSubscriptionSchema), async (req, res) => {
    try {
      const userId = req.session.userId as number;
      
      const subscriptionData = {
        subscriberId: userId,
        channelId: req.body.channelId
      };
      
      const subscription = await storage.createSubscription(subscriptionData);
      
      res.status(201).json(subscription);
    } catch (error) {
      console.error('Create subscription error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/users/:id/subscriptions', async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      const subscriptions = await storage.getSubscriptionsByUser(userId);
      
      // Get channel info for each subscription
      const subscriptionsWithChannel = await Promise.all(subscriptions.map(async (subscription) => {
        const channel = await storage.getChannel(subscription.channelId);
        const channelOwner = channel ? await storage.getUser(channel.userId) : null;
        
        return {
          ...subscription,
          channel: channel ? {
            ...channel,
            owner: channelOwner ? {
              id: channelOwner.id,
              username: channelOwner.username,
              displayName: channelOwner.displayName,
              profileImage: channelOwner.profileImage
            } : null
          } : null
        };
      }));
      
      res.json(subscriptionsWithChannel);
    } catch (error) {
      console.error('Get subscriptions error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Like Video Routes
  app.post('/api/videos/:id/like', requireAuth, async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const userId = req.session.userId as number;
      
      const likedVideoData = {
        userId,
        videoId
      };
      
      const likedVideo = await storage.createLikedVideo(likedVideoData);
      
      res.status(201).json(likedVideo);
    } catch (error) {
      console.error('Like video error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/users/:id/liked-videos', async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      const likedVideos = await storage.getLikedVideosByUser(userId);
      
      // Get video info for each liked video
      const likedVideosWithInfo = await Promise.all(likedVideos.map(async (likedVideo) => {
        const video = await storage.getVideo(likedVideo.videoId);
        const creator = video ? await storage.getUser(video.userId) : null;
        
        return {
          ...likedVideo,
          video: video ? {
            ...video,
            creator: creator ? {
              id: creator.id,
              username: creator.username,
              displayName: creator.displayName,
              profileImage: creator.profileImage
            } : null
          } : null
        };
      }));
      
      res.json(likedVideosWithInfo);
    } catch (error) {
      console.error('Get liked videos error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Get History Route
  app.get('/api/users/:id/history', requireAuth, async (req, res) => {
    try {
      // Ensure user is requesting their own history
      const userId = parseInt(req.params.id);
      if (userId !== req.session.userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const history = await storage.getVideoHistoryByUser(userId);
      
      // Get video info for each history item
      const historyWithInfo = await Promise.all(history.map(async (item) => {
        const video = await storage.getVideo(item.videoId);
        const creator = video ? await storage.getUser(video.userId) : null;
        
        return {
          ...item,
          video: video ? {
            ...video,
            creator: creator ? {
              id: creator.id,
              username: creator.username,
              displayName: creator.displayName,
              profileImage: creator.profileImage
            } : null
          } : null
        };
      }));
      
      res.json(historyWithInfo);
    } catch (error) {
      console.error('Get history error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Dashboard Routes
  app.get('/api/dashboard/stats', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      
      // Get user's videos
      const videos = await storage.getVideosByUser(userId);
      
      // Calculate stats
      const totalViews = videos.reduce((sum, video) => sum + video.views, 0);
      const totalLikes = videos.reduce((sum, video) => sum + video.likes, 0);
      
      // Get user for subscriber count
      const user = await storage.getUser(userId);
      
      res.json({
        totalVideos: videos.length,
        totalViews,
        totalLikes,
        subscriberCount: user?.subscriberCount || 0
      });
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Admin Routes
  app.get('/api/admin/users', requireAdmin, async (req, res) => {
    try {
      // Get all users
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error('Get admin users error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/admin/videos', requireAdmin, async (req, res) => {
    try {
      // Get all videos with user info
      const videos = await storage.getVideos(100, 0);
      const videosWithCreator = await Promise.all(videos.map(async (video) => {
        const creator = await storage.getUser(video.userId);
        return {
          ...video,
          creator: creator ? {
            id: creator.id,
            username: creator.username,
            displayName: creator.displayName,
            profileImage: creator.profileImage
          } : null
        };
      }));
      
      res.json(videosWithCreator);
    } catch (error) {
      console.error('Get admin videos error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/admin/users/:id/ban', requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { isBanned } = req.body;
      
      const user = await storage.updateUser(userId, { isBanned });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json(user);
    } catch (error) {
      console.error('Ban user error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/admin/users/:id/make-admin', requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { isAdmin } = req.body;
      
      const user = await storage.updateUser(userId, { isAdmin });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json(user);
    } catch (error) {
      console.error('Make admin error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.delete('/api/admin/videos/:id', requireAdmin, async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      
      const video = await storage.getVideo(videoId);
      if (!video) {
        return res.status(404).json({ message: 'Video not found' });
      }
      
      // Delete the video file
      if (video.filePath) {
        const filePath = path.join(process.cwd(), video.filePath.replace('/uploads/', ''));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      
      // Delete the thumbnail file
      if (video.thumbnailPath) {
        const thumbnailPath = path.join(process.cwd(), video.thumbnailPath.replace('/uploads/', ''));
        if (fs.existsSync(thumbnailPath)) {
          fs.unlinkSync(thumbnailPath);
        }
      }
      
      // Delete the video from DB
      await storage.deleteVideo(videoId);
      
      res.json({ message: 'Video deleted successfully' });
    } catch (error) {
      console.error('Delete video error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

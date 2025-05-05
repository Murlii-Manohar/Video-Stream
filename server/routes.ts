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
import { ZodError, z } from "zod";
import session from "express-session";
import MemoryStore from "memorystore";
import { initializeEmailService, sendVerificationEmail, verifyCode } from "./services/emailService";
import { uploadVideo, getVideoWithSignedUrls, deleteVideo, updateVideo } from "./services/videoService";
import { initializeS3Service } from "./services/s3Service";

// Create a memory store for sessions
const SessionStore = MemoryStore(session);

// Initialize services
initializeEmailService();
initializeS3Service().catch(error => {
  console.error('Failed to initialize S3 service:', error);
});

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
  
  // Create a route to serve local video files when S3 is unavailable
  app.get('/media/videos/:filename', (req, res) => {
    const filename = req.params.filename;
    let filePath: string;
    
    // First check if this is a direct absolute path video
    if (filename.includes('video-') && filename.includes('.mp4')) {
      // It's likely just the filename part
      filePath = path.resolve(`uploaded_files/${filename}`);
    } else {
      // For security, block any suspicious path traversal attempts
      return res.status(403).send('Invalid filename format');
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${filePath}`);
      return res.status(404).send('File not found');
    }
    
    // Get file stats for range requests
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;
    
    // Handle range requests for streaming
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;
      
      const file = fs.createReadStream(filePath, { start, end });
      
      const headers = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'video/mp4',
      };
      
      res.writeHead(206, headers);
      file.pipe(res);
    } else {
      // Send the entire file if no range is specified
      const headers = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      };
      
      res.writeHead(200, headers);
      fs.createReadStream(filePath).pipe(res);
    }
  });
  
  // Create a route to serve local thumbnail files when S3 is unavailable
  app.get('/media/thumbnails/:filename', (req, res) => {
    const filename = req.params.filename;
    // Handle both full paths and just filenames
    let filePath: string;
    
    if (filename.includes('/')) {
      // It's a full path - extract just the filename
      const parts = filename.split('/');
      const actualFilename = parts[parts.length - 1];
      filePath = path.resolve(`uploaded_files/${actualFilename}`);
    } else {
      filePath = path.resolve(`uploaded_files/${filename}`);
    }
    
    // For security, make sure it's in the uploaded_files directory
    if (!filePath.startsWith(path.resolve('uploaded_files'))) {
      return res.status(403).send('Forbidden');
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File not found');
    }
    
    // Determine the content type based on file extension
    const ext = path.extname(filePath).toLowerCase();
    let contentType = 'image/jpeg'; // Default
    
    if (ext === '.png') contentType = 'image/png';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.webp') contentType = 'image/webp';
    
    res.setHeader('Content-Type', contentType);
    fs.createReadStream(filePath).pipe(res);
  });

  // Middleware to handle validation errors
  const handleValidation = (schema: any) => async (req: Request, res: Response, next: any) => {
    try {
      // For multipart/form-data requests, handle boolean, number, and array conversions
      if (req.is('multipart/form-data')) {
        // Convert string "true"/"false" to boolean
        for (const key in req.body) {
          if (req.body[key] === 'true') req.body[key] = true;
          if (req.body[key] === 'false') req.body[key] = false;
          
          // Try to parse JSON for arrays
          if (typeof req.body[key] === 'string' && 
              (req.body[key].startsWith('[') || req.body[key].startsWith('{'))) {
            try {
              req.body[key] = JSON.parse(req.body[key]);
            } catch (e) {
              console.log(`Failed to parse JSON for field ${key}:`, e);
            }
          }
        }
      }
      
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      console.log('Validation error:', error);
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          message: 'Validation error', 
          errors: error.errors.map((err: any) => ({
            path: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
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
  
  // Serve videos and thumbnails with proper headers
  app.use('/media/videos', (req, res, next) => {
    // Add video-specific CORS headers
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Range');
    res.header('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');
    next();
  }, express.static(storage_dir));
  
  app.use('/media/thumbnails', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
  }, express.static(storage_dir));
  
  // Special route to serve full path videos
  app.get('/api/media/direct', (req, res) => {
    // Add CORS headers for video files
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Range');
    res.header('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');
    
    const filePath = req.query.path as string;
    
    if (!filePath) {
      return res.status(400).send('No file path provided');
    }
    
    // Security check: Only allow access to files in the uploaded_files directory
    if (!filePath.includes('uploaded_files') && !filePath.includes('/home/runner/workspace')) {
      return res.status(403).send('Access denied');
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${filePath}`);
      return res.status(404).send('File not found');
    }
    
    // Get file stats for range requests
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;
    
    // Handle range requests for streaming
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;
      
      const file = fs.createReadStream(filePath, { start, end });
      
      const headers = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'video/mp4',
      };
      
      res.writeHead(206, headers);
      file.pipe(res);
    } else {
      // Send the entire file if no range is specified
      const headers = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      };
      
      res.writeHead(200, headers);
      fs.createReadStream(filePath).pipe(res);
    }
  });

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
      
      try {
        // Use our S3 service to get video with signed URLs
        const { video, videoUrl, thumbnailUrl } = await getVideoWithSignedUrls(videoId);
        
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
          videoUrl,
          thumbnailUrl,
          creator: creator ? {
            id: creator.id,
            username: creator.username,
            displayName: creator.displayName,
            profileImage: creator.profileImage,
            subscriberCount: creator.subscriberCount
          } : null
        });
      } catch (s3Error) {
        console.error('S3 error:', s3Error);
        
        // Fallback to regular storage if S3 fails (temporary during migration)
        const video = await storage.getVideo(videoId);
        
        if (!video) {
          return res.status(404).json({ message: 'Video not found' });
        }
        
        // Increment view count
        await storage.incrementVideoViews(videoId);
        
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
      }
    } catch (error) {
      console.error('Get video error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/videos', requireAuth, upload.fields([
    { name: 'videoFile', maxCount: 1 },
    { name: 'thumbnailFile', maxCount: 1 }
  ]), async (req, res) => {
    try {
      const userId = req.session.userId as number;
      
      // Cast req.files to the correct type
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      // Check if video file was uploaded
      if (!files || !files['videoFile'] || files['videoFile'].length === 0) {
        return res.status(400).json({ message: 'No video file uploaded' });
      }
      
      const videoFile = files['videoFile'][0];
      let thumbnailFile = null;
      
      // Check if thumbnail was uploaded
      if (files['thumbnailFile'] && files['thumbnailFile'].length > 0) {
        thumbnailFile = files['thumbnailFile'][0];
      }
      
      // Handle boolean conversion
      if (typeof req.body.isQuickie === 'string') {
        req.body.isQuickie = req.body.isQuickie === 'true' ? true : false;
      }
      
      if (typeof req.body.isPublished === 'string') {
        req.body.isPublished = req.body.isPublished === 'true' ? true : false;
      }
      
      // Converting channelId to number if present
      if (req.body.channelId && typeof req.body.channelId === 'string') {
        const channelId = parseInt(req.body.channelId);
        if (!isNaN(channelId)) {
          req.body.channelId = channelId;
        }
      }
      
      // Converting duration to number if present
      if (req.body.duration && typeof req.body.duration === 'string') {
        const duration = parseInt(req.body.duration);
        if (!isNaN(duration)) {
          req.body.duration = duration;
        }
      }
      
      try {
        // Validate with schema
        const validatedData = insertVideoSchema.parse(req.body);
        
        // Set up data for S3 upload
        const videoData = {
          ...validatedData,
          userId,
          isPublished: true // Force all uploaded videos to be published
        };
        
        console.log('Uploading video to S3...');
        
        // Use our videoService to upload to S3 and create the video record
        const video = await uploadVideo(
          videoFile.path, 
          thumbnailFile ? thumbnailFile.path : null,
          videoData
        );
        
        console.log('Video created and uploaded successfully:', JSON.stringify(video));
        res.status(201).json(video);
      } catch (validationError) {
        if (validationError instanceof ZodError) {
          console.log('Video validation error:', validationError.errors);
          return res.status(400).json({ 
            message: 'Validation error', 
            errors: validationError.errors.map(err => ({
              path: err.path.join('.'),
              message: err.message,
              code: err.code
            }))
          });
        }
        throw validationError;
      }
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
      
      // Check if current user is subscribed to this channel
      let isUserSubscribed = false;
      if (req.session.userId) {
        const subscriptions = await storage.getSubscriptionsByUser(req.session.userId);
        isUserSubscribed = subscriptions.some(sub => sub.channelId === channelId);
      }
      
      res.json({
        ...channel,
        isUserSubscribed,
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
  
  // Subscribe to a channel
  app.post('/api/channels/:channelId/subscribe', requireAuth, async (req, res) => {
    try {
      const channelId = parseInt(req.params.channelId);
      const userId = req.session.userId!;
      
      if (isNaN(channelId)) {
        return res.status(400).json({ message: 'Invalid channel ID' });
      }
      
      const channel = await storage.getChannel(channelId);
      if (!channel) {
        return res.status(404).json({ message: 'Channel not found' });
      }
      
      // Check if user is already subscribed
      const subscriptions = await storage.getSubscriptionsByUser(userId);
      const existingSubscription = subscriptions.find(sub => sub.channelId === channelId);
      
      if (existingSubscription) {
        return res.json({ 
          success: true, 
          message: 'Already subscribed to this channel',
          isUserSubscribed: true 
        });
      }
      
      // Create subscription
      await storage.createSubscription({
        userId: channel.userId,
        channelId,
        subscriberId: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Increment subscriber count for the channel owner
      const channelOwner = await storage.getUser(channel.userId);
      if (channelOwner) {
        await storage.updateUser(channel.userId, {
          subscriberCount: (channelOwner.subscriberCount || 0) + 1
        });
      }
      
      res.status(201).json({ success: true, message: 'Subscribed successfully', isUserSubscribed: true });
    } catch (error) {
      console.error('Error subscribing to channel:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Unsubscribe from a channel
  app.delete('/api/channels/:channelId/subscribe', requireAuth, async (req, res) => {
    try {
      const channelId = parseInt(req.params.channelId);
      const userId = req.session.userId!;
      
      if (isNaN(channelId)) {
        return res.status(400).json({ message: 'Invalid channel ID' });
      }
      
      const channel = await storage.getChannel(channelId);
      if (!channel) {
        return res.status(404).json({ message: 'Channel not found' });
      }
      
      // Find the subscription
      const subscriptions = await storage.getSubscriptionsByUser(userId);
      const existingSubscription = subscriptions.find(sub => sub.channelId === channelId);
      
      if (!existingSubscription) {
        return res.json({ 
          success: true, 
          message: 'Not subscribed to this channel',
          isUserSubscribed: false 
        });
      }
      
      // For now, we'll just decrease the subscriber count
      // Normally we would need a deleteSubscription method
      
      // Decrement subscriber count for the channel owner
      const channelOwner = await storage.getUser(channel.userId);
      if (channelOwner && channelOwner.subscriberCount && channelOwner.subscriberCount > 0) {
        await storage.updateUser(channel.userId, {
          subscriberCount: channelOwner.subscriberCount - 1
        });
      }
      
      res.json({ success: true, message: 'Unsubscribed successfully', isUserSubscribed: false });
    } catch (error) {
      console.error('Error unsubscribing from channel:', error);
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
      
      try {
        // Use our video service to delete from S3 and database
        const deleted = await deleteVideo(videoId);
        
        if (!deleted) {
          return res.status(500).json({ message: 'Failed to delete video' });
        }
        
        res.json({ message: 'Video deleted successfully' });
      } catch (s3Error) {
        console.error('S3 error during delete:', s3Error);
        
        // Fallback to storage method if S3 fails (temporary during migration)
        const video = await storage.getVideo(videoId);
        if (!video) {
          return res.status(404).json({ message: 'Video not found' });
        }
        
        const deleted = await storage.deleteVideo(videoId);
        
        if (!deleted) {
          return res.status(500).json({ message: 'Failed to delete video' });
        }
        
        res.json({ message: 'Video deleted successfully (fallback)' });
      }
    } catch (error) {
      console.error('Delete video error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get all reports
  app.get('/api/admin/reports', requireAdmin, async (req, res) => {
    try {
      // Use a placeholder for now, eventually add a reports table to the database
      const mockReports = [
        {
          id: 1,
          type: "video",
          contentId: 3,
          reportedBy: 5,
          reason: "Inappropriate content",
          details: "Contains non-consensual acts",
          createdAt: new Date().toISOString(),
          status: "pending"
        },
        {
          id: 2,
          type: "comment",
          contentId: 7,
          reportedBy: 3,
          reason: "Harassment",
          details: "User is making threats in comments",
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          status: "resolved"
        },
        {
          id: 3,
          type: "user",
          contentId: 8,
          reportedBy: 2,
          reason: "Spam",
          details: "User is posting spam content repeatedly",
          createdAt: new Date(Date.now() - 172800000).toISOString(),
          status: "pending"
        }
      ];
      
      // Return the mock data
      res.json(mockReports);
    } catch (error) {
      console.error('Get reports error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Update report status
  app.post('/api/admin/reports/:id/resolve', requireAdmin, async (req, res) => {
    try {
      const reportId = parseInt(req.params.id);
      // In a real implementation, update the report status in the database
      res.json({ 
        id: reportId,
        status: 'resolved',
        message: 'Report marked as resolved successfully' 
      });
    } catch (error) {
      console.error('Resolve report error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Ad Management Routes
  
  // Get site ad settings
  app.get('/api/admin/ads/site', requireAdmin, async (req, res) => {
    try {
      const settings = await storage.getSiteSettings();
      if (!settings) {
        return res.status(404).json({ message: 'Site settings not found' });
      }
      
      res.json({
        siteAdsEnabled: settings.siteAdsEnabled,
        siteAdUrls: settings.siteAdUrls,
        siteAdPositions: settings.siteAdPositions
      });
    } catch (error) {
      console.error('Get site ad settings error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Update site ad settings
  app.post('/api/admin/ads/site', requireAdmin, async (req, res) => {
    try {
      const { siteAdsEnabled, siteAdUrls, siteAdPositions } = req.body;
      
      const settings = await storage.updateSiteSettings({
        siteAdsEnabled,
        siteAdUrls,
        siteAdPositions
      });
      
      res.json({
        siteAdsEnabled: settings.siteAdsEnabled,
        siteAdUrls: settings.siteAdUrls,
        siteAdPositions: settings.siteAdPositions,
        message: 'Site ad settings updated successfully'
      });
    } catch (error) {
      console.error('Update site ad settings error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Toggle video ads
  app.post('/api/admin/ads/videos/:id', requireAdmin, async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const { hasAds, adUrl, adStartTime } = req.body;
      
      const video = await storage.toggleVideoAds(
        videoId, 
        hasAds, 
        adUrl, 
        adStartTime ? parseInt(adStartTime) : undefined
      );
      
      if (!video) {
        return res.status(404).json({ message: 'Video not found' });
      }
      
      res.json({
        videoId: video.id,
        hasAds: video.hasAds,
        adUrl: video.adUrl,
        adStartTime: video.adStartTime,
        message: hasAds ? 'Ads enabled for this video' : 'Ads disabled for this video'
      });
    } catch (error) {
      console.error('Toggle video ads error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

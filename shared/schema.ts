import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  profileImage: text("profile_image"),
  bio: text("bio"),
  isAdmin: boolean("is_admin").default(false),
  isBanned: boolean("is_banned").default(false),
  subscriberCount: integer("subscriber_count").default(0),
  isVerified: boolean("is_verified").default(false),
});

// Channels table
export const channels = pgTable("channels", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  bannerImage: text("banner_image"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Videos table
export const videos = pgTable("videos", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  filePath: text("file_path").notNull(),
  thumbnailPath: text("thumbnail_path"),
  duration: integer("duration"),
  views: integer("views").default(0),
  likes: integer("likes").default(0),
  dislikes: integer("dislikes").default(0),
  categories: text("categories").array(),
  tags: text("tags").array(),
  isPublished: boolean("is_published").default(true),
  isQuickie: boolean("is_quickie").default(false),
  hasAds: boolean("has_ads").default(false),
  adUrl: text("ad_url"),
  adStartTime: integer("ad_start_time"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Site Settings table
export const siteSettings = pgTable("site_settings", {
  id: serial("id").primaryKey(),
  siteAdsEnabled: boolean("site_ads_enabled").default(false),
  siteAdUrls: text("site_ad_urls").array(),
  siteAdPositions: text("site_ad_positions").array(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Comments table
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id").notNull().references(() => videos.id),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  likes: integer("likes").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Subscriptions table
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  subscriberId: integer("subscriber_id").notNull().references(() => users.id),
  channelId: integer("channel_id").notNull().references(() => channels.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// LikedVideos table
export const likedVideos = pgTable("liked_videos", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  videoId: integer("video_id").notNull().references(() => videos.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Video History table
export const videoHistory = pgTable("video_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  videoId: integer("video_id").notNull().references(() => videos.id),
  watchedAt: timestamp("watched_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  isAdmin: true,
  isBanned: true,
  subscriberCount: true,
  isVerified: true,
});

export const insertChannelSchema = createInsertSchema(channels).omit({
  id: true,
  createdAt: true,
});

export const insertVideoSchema = createInsertSchema(videos).omit({
  id: true,
  views: true,
  likes: true,
  dislikes: true,
  hasAds: true,
  adUrl: true,
  adStartTime: true,
  createdAt: true,
  // For form data upload, we'll add these back manually on the server
  userId: true,
  filePath: true,
}).extend({
  // Make tags field accept both arrays and strings
  tags: z.union([
    z.string().transform(value => value.split(',').map(tag => tag.trim())),
    z.array(z.string())
  ]).optional(),
  // Make categories field accept both arrays and strings (JSON strings)
  categories: z.union([
    z.string().transform(value => {
      try {
        return JSON.parse(value);
      } catch (e) {
        return value.split(',').map(cat => cat.trim());
      }
    }),
    z.array(z.string())
  ]).optional(),
}).refine((data) => {
  // If it's a quickie, duration must be less than or equal to 120 seconds (2 minutes)
  if (data.isQuickie && data.duration && data.duration > 120) {
    return false;
  }
  return true;
}, {
  message: "Quickies must be 2 minutes or less",
  path: ["duration"]
});

export const insertSiteSettingsSchema = createInsertSchema(siteSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  likes: true,
  createdAt: true,
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
});

export const insertLikedVideoSchema = createInsertSchema(likedVideos).omit({
  id: true,
  createdAt: true,
});

export const insertVideoHistorySchema = createInsertSchema(videoHistory).omit({
  id: true,
  watchedAt: true,
});

// Authentication schemas
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string().min(6),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Email verification schemas
export const sendVerificationSchema = z.object({
  email: z.string().email(),
});

export const verifyEmailSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginSchema>;
export type RegisterUser = z.infer<typeof registerSchema>;
export type SendVerification = z.infer<typeof sendVerificationSchema>;
export type VerifyEmail = z.infer<typeof verifyEmailSchema>;

export type Channel = typeof channels.$inferSelect;
export type InsertChannel = z.infer<typeof insertChannelSchema>;

export type Video = typeof videos.$inferSelect;
export type InsertVideo = z.infer<typeof insertVideoSchema>;

export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

export type LikedVideo = typeof likedVideos.$inferSelect;
export type InsertLikedVideo = z.infer<typeof insertLikedVideoSchema>;

export type VideoHistory = typeof videoHistory.$inferSelect;
export type InsertVideoHistory = z.infer<typeof insertVideoHistorySchema>;

export type SiteSettings = typeof siteSettings.$inferSelect;
export type InsertSiteSettings = z.infer<typeof insertSiteSettingsSchema>;

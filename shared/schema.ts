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
  subscriberCount: integer("subscriber_count").default(0),
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
  category: text("category"),
  tags: text("tags").array(),
  isPublished: boolean("is_published").default(true),
  isQuickie: boolean("is_quickie").default(false),
  createdAt: timestamp("created_at").defaultNow(),
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
  subscriberCount: true,
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
  createdAt: true,
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

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginSchema>;
export type RegisterUser = z.infer<typeof registerSchema>;

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

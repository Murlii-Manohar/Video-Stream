import { createReadStream } from 'fs';
import * as path from 'path';
import { 
  uploadFileToS3, 
  getSignedFileUrl, 
  deleteFileFromS3, 
  generateS3FileKey 
} from './s3Service';
import { storage } from '../storage';
import { InsertVideo, type Video } from '@shared/schema';
import { log } from '../vite';

/**
 * Uploads a video file to S3 and creates a video record in the database
 * @param filePath Path to the temporarily uploaded video file
 * @param thumbnailPath Path to the temporarily uploaded thumbnail file
 * @param videoData Video metadata for database record
 * @returns The created video record
 */
export async function uploadVideo(
  filePath: string,
  thumbnailPath: string | null,
  videoData: Omit<InsertVideo, 'filePath' | 'thumbnailPath'>
): Promise<Video> {
  try {
    const userId = videoData.userId;
    const originalFilename = path.basename(filePath);
    const s3VideoKey = generateS3FileKey(userId, originalFilename);
    
    // Upload video to S3
    const videoStream = createReadStream(filePath);
    await uploadFileToS3(
      s3VideoKey, 
      videoStream, 
      videoData.isQuickie ? 'video/mp4' : 'video/mp4'
    );
    
    let s3ThumbnailKey = null;
    
    // Upload thumbnail to S3 if provided
    if (thumbnailPath) {
      const originalThumbnailFilename = path.basename(thumbnailPath);
      s3ThumbnailKey = generateS3FileKey(userId, originalThumbnailFilename, true);
      
      const thumbnailStream = createReadStream(thumbnailPath);
      await uploadFileToS3(
        s3ThumbnailKey, 
        thumbnailStream, 
        'image/jpeg', 
        true
      );
    }
    
    // Create video record in database
    const video = await storage.createVideo({
      ...videoData,
      filePath: s3VideoKey,
      thumbnailPath: s3ThumbnailKey,
      views: 0,
      likes: 0,
      dislikes: 0,
      hasAds: false,
      adUrl: null,
      adStartTime: null
    });
    
    log(`Video uploaded successfully: ${video.id}`, 'videoService');
    return video;
  } catch (error) {
    log(`Error uploading video: ${error}`, 'videoService');
    throw error;
  }
}

/**
 * Gets a signed URL for accessing a video
 * @param videoId ID of the video
 * @returns Object containing video information and signed URLs
 */
export async function getVideoWithSignedUrls(videoId: number): Promise<{
  video: Video;
  videoUrl: string;
  thumbnailUrl: string | null;
}> {
  try {
    const video = await storage.getVideo(videoId);
    
    if (!video) {
      throw new Error(`Video not found: ${videoId}`);
    }
    
    // Generate signed URL for video
    const videoUrl = await getSignedFileUrl(video.filePath);
    
    // Generate signed URL for thumbnail if exists
    let thumbnailUrl = null;
    if (video.thumbnailPath) {
      thumbnailUrl = await getSignedFileUrl(video.thumbnailPath, true);
    }
    
    return {
      video,
      videoUrl,
      thumbnailUrl
    };
  } catch (error) {
    log(`Error getting video with signed URLs: ${error}`, 'videoService');
    throw error;
  }
}

/**
 * Deletes a video from S3 and the database
 * @param videoId ID of the video to delete
 * @returns True if the video was deleted, false otherwise
 */
export async function deleteVideo(videoId: number): Promise<boolean> {
  try {
    const video = await storage.getVideo(videoId);
    
    if (!video) {
      throw new Error(`Video not found: ${videoId}`);
    }
    
    // Delete video file from S3
    await deleteFileFromS3(video.filePath);
    
    // Delete thumbnail from S3 if exists
    if (video.thumbnailPath) {
      await deleteFileFromS3(video.thumbnailPath, true);
    }
    
    // Delete video record from database
    const deleted = await storage.deleteVideo(videoId);
    
    log(`Video deleted successfully: ${videoId}`, 'videoService');
    return deleted;
  } catch (error) {
    log(`Error deleting video: ${error}`, 'videoService');
    throw error;
  }
}

/**
 * Updates a video in the database and S3 if new files are provided
 * @param videoId ID of the video to update
 * @param videoData Updated video data
 * @param newFilePath Path to a new video file (optional)
 * @param newThumbnailPath Path to a new thumbnail file (optional)
 * @returns The updated video
 */
export async function updateVideo(
  videoId: number,
  videoData: Partial<Video>,
  newFilePath?: string,
  newThumbnailPath?: string
): Promise<Video | undefined> {
  try {
    const video = await storage.getVideo(videoId);
    
    if (!video) {
      throw new Error(`Video not found: ${videoId}`);
    }
    
    let updatedData: Partial<Video> = { ...videoData };
    
    // Handle new video file upload
    if (newFilePath) {
      // Delete old video file from S3
      await deleteFileFromS3(video.filePath);
      
      // Upload new video file to S3
      const originalFilename = path.basename(newFilePath);
      const s3VideoKey = generateS3FileKey(video.userId, originalFilename);
      
      const videoStream = createReadStream(newFilePath);
      await uploadFileToS3(
        s3VideoKey, 
        videoStream, 
        videoData.isQuickie ? 'video/mp4' : 'video/mp4'
      );
      
      updatedData.filePath = s3VideoKey;
    }
    
    // Handle new thumbnail upload
    if (newThumbnailPath) {
      // Delete old thumbnail from S3 if exists
      if (video.thumbnailPath) {
        await deleteFileFromS3(video.thumbnailPath, true);
      }
      
      // Upload new thumbnail to S3
      const originalThumbnailFilename = path.basename(newThumbnailPath);
      const s3ThumbnailKey = generateS3FileKey(video.userId, originalThumbnailFilename, true);
      
      const thumbnailStream = createReadStream(newThumbnailPath);
      await uploadFileToS3(
        s3ThumbnailKey, 
        thumbnailStream, 
        'image/jpeg', 
        true
      );
      
      updatedData.thumbnailPath = s3ThumbnailKey;
    }
    
    // Update video record in database
    const updatedVideo = await storage.updateVideo(videoId, updatedData);
    
    log(`Video updated successfully: ${videoId}`, 'videoService');
    return updatedVideo;
  } catch (error) {
    log(`Error updating video: ${error}`, 'videoService');
    throw error;
  }
}
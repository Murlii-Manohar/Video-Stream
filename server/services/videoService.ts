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
    let s3VideoKey = generateS3FileKey(userId, originalFilename);
    
    let s3ThumbnailKey = null;
    
    try {
      // Upload video to S3
      const videoStream = createReadStream(filePath);
      await uploadFileToS3(
        s3VideoKey, 
        videoStream, 
        videoData.isQuickie ? 'video/mp4' : 'video/mp4'
      );
      
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
    } catch (s3Error: any) {
      // Handle various S3 errors gracefully
      if (
        s3Error.Code === 'AccessDenied' || 
        (s3Error.$metadata && s3Error.$metadata.httpStatusCode === 403) ||
        s3Error.Code === 'NoSuchBucket'
      ) {
        log(`S3 error (${s3Error.Code}), falling back to local references: ${s3Error}`, 'videoService');
        
        // Use original file paths instead of S3 keys
        s3VideoKey = filePath;
        s3ThumbnailKey = thumbnailPath;
      } else {
        // For other errors, re-throw
        throw s3Error;
      }
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
    
    let videoUrl: string;
    let thumbnailUrl: string | null = null;
    
    // Check if we're dealing with a local file path
    const isLocalVideoPath = video.filePath.startsWith('/') || 
                            video.filePath.includes('./') || 
                            video.filePath.includes('../');
    
    const isLocalThumbnailPath = video.thumbnailPath && 
                               (video.thumbnailPath.startsWith('/') || 
                                video.thumbnailPath.includes('./') || 
                                video.thumbnailPath.includes('../'));
    
    if (isLocalVideoPath) {
      // For local file paths, use our media endpoint with just the filename
      const filename = path.basename(video.filePath);
      videoUrl = `/media/videos/${filename}`;
      log(`Using media route for video: ${videoUrl}`, 'videoService');
    } else {
      try {
        // Try to get signed URL from S3
        videoUrl = await getSignedFileUrl(video.filePath);
      } catch (s3Error: any) {
        // Handle S3 errors by converting to local media route
        log(`S3 error (${s3Error.Code}), using media route: ${s3Error}`, 'videoService');
        const filename = path.basename(video.filePath);
        videoUrl = `/media/videos/${filename}`;
      }
    }
    
    // Handle thumbnail URL
    if (video.thumbnailPath) {
      if (isLocalThumbnailPath) {
        // For local thumbnail paths, use our media endpoint with just the filename
        const filename = path.basename(video.thumbnailPath);
        thumbnailUrl = `/media/thumbnails/${filename}`;
        log(`Using media route for thumbnail: ${thumbnailUrl}`, 'videoService');
      } else {
        try {
          // Try to get signed URL from S3
          thumbnailUrl = await getSignedFileUrl(video.thumbnailPath, true);
        } catch (s3Error: any) {
          // Handle S3 errors by converting to local media route for thumbnail
          log(`S3 error (${s3Error.Code}), using media route for thumbnail: ${s3Error}`, 'videoService');
          
          if (video.thumbnailPath) {
            const filename = path.basename(video.thumbnailPath);
            thumbnailUrl = `/media/thumbnails/${filename}`;
          }
        }
      }
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
    
    try {
      // Try to delete video file from S3
      await deleteFileFromS3(video.filePath);
      
      // Try to delete thumbnail from S3 if exists
      if (video.thumbnailPath) {
        await deleteFileFromS3(video.thumbnailPath, true);
      }
    } catch (s3Error: any) {
      // Handle S3 access issues
      if (s3Error.Code === 'AccessDenied' || (s3Error.$metadata && s3Error.$metadata.httpStatusCode === 403)) {
        log(`S3 access denied when deleting files, continuing with database deletion: ${s3Error}`, 'videoService');
      } else if (s3Error.Code === 'NoSuchKey' || s3Error.message?.includes('NoSuchKey')) {
        log(`S3 key not found, continuing with database deletion: ${s3Error}`, 'videoService');
      } else {
        // For other errors, log but continue with deletion
        log(`Error deleting files from S3: ${s3Error}, continuing with database deletion`, 'videoService');
      }
    }
    
    // Delete video record from database regardless of S3 result
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
    
    try {
      // Handle new video file upload
      if (newFilePath) {
        try {
          // Try to delete old video file from S3
          await deleteFileFromS3(video.filePath);
        } catch (deleteError) {
          // Log but continue if delete fails
          log(`Error deleting old video from S3: ${deleteError}`, 'videoService');
        }
        
        // Upload new video file to S3
        const originalFilename = path.basename(newFilePath);
        const s3VideoKey = generateS3FileKey(video.userId, originalFilename);
        
        const videoStream = createReadStream(newFilePath);
        await uploadFileToS3(
          s3VideoKey, 
          videoStream, 
          videoData.isQuickie || video.isQuickie ? 'video/mp4' : 'video/mp4'
        );
        
        updatedData.filePath = s3VideoKey;
      }
      
      // Handle new thumbnail upload
      if (newThumbnailPath) {
        try {
          // Try to delete old thumbnail from S3 if exists
          if (video.thumbnailPath) {
            await deleteFileFromS3(video.thumbnailPath, true);
          }
        } catch (deleteError) {
          // Log but continue if delete fails
          log(`Error deleting old thumbnail from S3: ${deleteError}`, 'videoService');
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
    } catch (s3Error: any) {
      // Handle S3 access issues
      if (s3Error.Code === 'AccessDenied' || (s3Error.$metadata && s3Error.$metadata.httpStatusCode === 403)) {
        log(`S3 access denied, falling back to local file storage: ${s3Error}`, 'videoService');
        
        // Use the local file paths instead
        if (newFilePath) {
          updatedData.filePath = newFilePath;
        }
        if (newThumbnailPath) {
          updatedData.thumbnailPath = newThumbnailPath;
        }
      } else {
        // For other errors, re-throw
        throw s3Error;
      }
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

/**
 * Uploads a custom thumbnail for an existing video
 * @param videoId ID of the video
 * @param thumbnailPath Path to the thumbnail file
 * @returns The updated video with URLs
 */
export async function updateVideoThumbnail(
  videoId: number,
  thumbnailPath: string
): Promise<{
  video: Video;
  thumbnailUrl: string | null;
}> {
  try {
    // First update the video with the new thumbnail
    const updatedVideo = await updateVideo(
      videoId,
      {}, // No other changes
      undefined, // No new video file
      thumbnailPath // Only updating thumbnail
    );
    
    if (!updatedVideo) {
      throw new Error(`Failed to update video thumbnail: ${videoId}`);
    }
    
    // Get the video with signed URLs
    const result = await getVideoWithSignedUrls(videoId);
    
    return {
      video: result.video,
      thumbnailUrl: result.thumbnailUrl
    };
  } catch (error) {
    log(`Error updating video thumbnail: ${error}`, 'videoService');
    throw error;
  }
}
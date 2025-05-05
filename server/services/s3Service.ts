import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand,
  ListObjectsV2Command
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createReadStream, ReadStream } from 'fs';
import { log } from '../vite';

// Initialize the S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

// Bucket name configuration
const BUCKET_NAME = 'xplayhd-videos';
const THUMBNAIL_BUCKET_NAME = 'xplayhd-thumbnails';

// Maximum expiry time for signed URLs (in seconds)
const URL_EXPIRY = 60 * 60; // 1 hour

/**
 * Uploads a file to S3 bucket
 * @param fileKey The key under which the file will be stored in S3
 * @param fileStream The readable stream of the file to upload
 * @param mimetype The MIME type of the file
 * @param isThumbnail Whether the file is a thumbnail or a video
 * @returns Promise that resolves when the upload is complete
 */
export async function uploadFileToS3(
  fileKey: string,
  fileStream: ReadStream,
  mimetype: string,
  isThumbnail: boolean = false
): Promise<void> {
  const bucketName = isThumbnail ? THUMBNAIL_BUCKET_NAME : BUCKET_NAME;
  
  try {
    const uploadParams = {
      Bucket: bucketName,
      Key: fileKey,
      Body: fileStream,
      ContentType: mimetype,
    };

    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);
    
    log(`Successfully uploaded file to S3: ${fileKey}`, 's3Service');
  } catch (error) {
    log(`Error uploading file to S3: ${error}`, 's3Service');
    throw error;
  }
}

/**
 * Generates a signed URL for accessing a file in S3
 * @param fileKey The key of the file in S3
 * @param isThumbnail Whether the file is a thumbnail or a video
 * @returns Promise that resolves to the signed URL
 */
export async function getSignedFileUrl(
  fileKey: string,
  isThumbnail: boolean = false
): Promise<string> {
  const bucketName = isThumbnail ? THUMBNAIL_BUCKET_NAME : BUCKET_NAME;
  
  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
    });

    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: URL_EXPIRY,
    });
    
    return signedUrl;
  } catch (error) {
    log(`Error generating signed URL for file: ${error}`, 's3Service');
    throw error;
  }
}

/**
 * Deletes a file from S3
 * @param fileKey The key of the file to delete
 * @param isThumbnail Whether the file is a thumbnail or a video
 * @returns Promise that resolves when the deletion is complete
 */
export async function deleteFileFromS3(
  fileKey: string,
  isThumbnail: boolean = false
): Promise<void> {
  const bucketName = isThumbnail ? THUMBNAIL_BUCKET_NAME : BUCKET_NAME;
  
  try {
    const deleteParams = {
      Bucket: bucketName,
      Key: fileKey,
    };

    const command = new DeleteObjectCommand(deleteParams);
    await s3Client.send(command);
    
    log(`Successfully deleted file from S3: ${fileKey}`, 's3Service');
  } catch (error) {
    log(`Error deleting file from S3: ${error}`, 's3Service');
    throw error;
  }
}

/**
 * Lists all files in the S3 bucket
 * @param prefix The prefix to filter the files
 * @param isThumbnail Whether to list thumbnails or videos
 * @returns Promise that resolves to a list of file keys
 */
export async function listFilesInS3(
  prefix: string = '',
  isThumbnail: boolean = false
): Promise<string[]> {
  const bucketName = isThumbnail ? THUMBNAIL_BUCKET_NAME : BUCKET_NAME;
  
  try {
    const listParams = {
      Bucket: bucketName,
      Prefix: prefix,
    };

    const command = new ListObjectsV2Command(listParams);
    const response = await s3Client.send(command);
    
    const fileKeys: string[] = [];
    if (response.Contents) {
      for (const object of response.Contents) {
        if (object.Key) {
          fileKeys.push(object.Key);
        }
      }
    }
    
    return fileKeys;
  } catch (error) {
    log(`Error listing files in S3: ${error}`, 's3Service');
    throw error;
  }
}

/**
 * Generates a unique file key for S3
 * @param userId The ID of the user uploading the file
 * @param originalFilename The original filename
 * @param isThumbnail Whether the file is a thumbnail or a video
 * @returns A unique file key
 */
export function generateS3FileKey(
  userId: number,
  originalFilename: string,
  isThumbnail: boolean = false
): string {
  const timestamp = Date.now();
  const fileExtension = originalFilename.split('.').pop() || '';
  const randomString = Math.random().toString(36).substring(2, 8);
  
  const prefix = isThumbnail ? 'thumbnails' : 'videos';
  
  return `${prefix}/user_${userId}/${timestamp}_${randomString}.${fileExtension}`;
}

/**
 * Creates a bucket if it doesn't exist
 * @param bucketName The name of the bucket to create
 */
async function createBucketIfNotExists(bucketName: string): Promise<void> {
  try {
    // Check if the bucket exists by listing its contents
    await s3Client.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        MaxKeys: 1
      })
    );
    log(`Bucket ${bucketName} already exists`, 's3Service');
  } catch (error: any) {
    // If the bucket doesn't exist, create it
    if (error.$metadata?.httpStatusCode === 404) {
      try {
        log(`Creating bucket: ${bucketName}`, 's3Service');
        
        // Create the bucket
        await s3Client.send(
          new CreateBucketCommand({
            Bucket: bucketName
          })
        );
        
        log(`Bucket ${bucketName} created successfully`, 's3Service');
      } catch (createError) {
        log(`Error creating bucket ${bucketName}: ${createError}`, 's3Service');
        throw createError;
      }
    } else {
      log(`Error checking bucket ${bucketName}: ${error}`, 's3Service');
      throw error;
    }
  }
}

/**
 * Initializes the S3 service
 */
export async function initializeS3Service(): Promise<void> {
  try {
    log('Initializing S3 service...', 's3Service');
    
    // Create buckets if they don't exist
    try {
      await createBucketIfNotExists(BUCKET_NAME);
      await createBucketIfNotExists(THUMBNAIL_BUCKET_NAME);
      
      log('S3 service initialized successfully', 's3Service');
    } catch (bucketError) {
      log(`Failed to create or check buckets: ${bucketError}`, 's3Service');
      throw bucketError;
    }
  } catch (error) {
    log(`Error initializing S3 service: ${error}`, 's3Service');
    throw error;
  }
}
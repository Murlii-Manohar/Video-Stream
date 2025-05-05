import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand,
  ListObjectsV2Command,
  CreateBucketCommand
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
const BUCKET_NAME = 'pornvilla-videos';
const THUMBNAIL_BUCKET_NAME = 'pornvilla-thumbnails';

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

    try {
      const command = new PutObjectCommand(uploadParams);
      await s3Client.send(command);
      log(`Successfully uploaded file to S3: ${fileKey}`, 's3Service');
    } catch (uploadError: any) {
      // If bucket doesn't exist, try to create it first and then upload
      if (uploadError.Code === 'NoSuchBucket') {
        log(`Bucket ${bucketName} does not exist. Attempting to create it...`, 's3Service');
        
        try {
          // Try to create the bucket
          await createBucketIfNotExists(bucketName);
          
          // Reopen the file stream which might have been consumed
          fileStream.close();
          const newFileStream = createReadStream(fileStream.path);
          
          // Retry the upload
          const retryCommand = new PutObjectCommand({
            ...uploadParams,
            Body: newFileStream,
          });
          await s3Client.send(retryCommand);
          log(`Successfully uploaded file to S3 after creating bucket: ${fileKey}`, 's3Service');
        } catch (bucketCreateError: any) {
          // If we can't create the bucket (likely due to permissions), log and re-throw
          log(`Failed to create bucket ${bucketName}: ${bucketCreateError}`, 's3Service');
          throw bucketCreateError;
        }
      } else {
        // For other errors, re-throw
        throw uploadError;
      }
    }
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
    // Check if the key could be a local file path
    if (fileKey.startsWith('/') || fileKey.includes('./') || fileKey.includes('../')) {
      log(`Key appears to be a local file path: ${fileKey}, returning as-is`, 's3Service');
      return fileKey;
    }
    
    try {
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
      });

      const signedUrl = await getSignedUrl(s3Client, command, {
        expiresIn: URL_EXPIRY,
      });
      
      return signedUrl;
    } catch (s3Error: any) {
      // Handle S3 access issues
      if (s3Error.Code === 'NoSuchBucket' || s3Error.Code === 'NoSuchKey') {
        log(`S3 error (${s3Error.Code}) when generating signed URL: ${s3Error}`, 's3Service');
        // Return the original key as a fallback
        return fileKey;
      }
      throw s3Error;
    }
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
    // Check if the key is a local file path
    if (fileKey.startsWith('/') || fileKey.includes('./') || fileKey.includes('../')) {
      log(`Key appears to be a local file path: ${fileKey}, skipping S3 deletion`, 's3Service');
      return;
    }
    
    const deleteParams = {
      Bucket: bucketName,
      Key: fileKey,
    };

    try {
      const command = new DeleteObjectCommand(deleteParams);
      await s3Client.send(command);
      
      log(`Successfully deleted file from S3: ${fileKey}`, 's3Service');
    } catch (s3Error: any) {
      // Handle NoSuchBucket or NoSuchKey errors
      if (s3Error.Code === 'NoSuchBucket' || s3Error.Code === 'NoSuchKey') {
        log(`S3 error (${s3Error.Code}) when deleting file: ${s3Error}`, 's3Service');
        // No need to throw an error here, just log it and continue
        return;
      }
      throw s3Error;
    }
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

    try {
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
    } catch (s3Error: any) {
      // Handle NoSuchBucket errors
      if (s3Error.Code === 'NoSuchBucket') {
        log(`Bucket ${bucketName} does not exist, returning empty list: ${s3Error}`, 's3Service');
        return [];
      }
      throw s3Error;
    }
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
    
    // Attempt to create buckets if they don't exist
    try {
      // We'll try to create the buckets, but if we get an AccessDenied error,
      // we'll assume the buckets either already exist or will be created externally
      try {
        await createBucketIfNotExists(BUCKET_NAME);
        await createBucketIfNotExists(THUMBNAIL_BUCKET_NAME);
      } catch (accessError: any) {
        // If it's an access denied error, we'll log it but proceed
        if (accessError.Code === 'AccessDenied') {
          log('Access denied when creating buckets. Assuming buckets exist or will be created externally.', 's3Service');
        } else {
          // For other errors, re-throw
          throw accessError;
        }
      }
      
      log('S3 service initialized successfully', 's3Service');
    } catch (bucketError) {
      log(`Failed to create or check buckets: ${bucketError}`, 's3Service');
      log('Continuing anyway - bucket operations will be attempted at runtime', 's3Service');
      // We don't throw here to allow the service to initialize even with bucket issues
    }
  } catch (error) {
    log(`Error initializing S3 service: ${error}`, 's3Service');
    // We log the error, but don't throw - allowing the application to start anyway
    // Operations will fail at runtime if the S3 configuration is incorrect
  }
}
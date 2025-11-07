import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || '';

export interface UploadResult {
  url: string;
  key: string;
  bucket: string;
  etag?: string;
}

/**
 * Upload a file buffer to S3
 * @param buffer - File buffer to upload
 * @param key - S3 object key (path)
 * @param contentType - MIME type of the file
 * @param metadata - Optional metadata to attach to the object
 * @returns Upload result with URL and key
 */
export async function uploadToS3(
  buffer: Buffer,
  key: string,
  contentType: string,
  metadata?: Record<string, string>
): Promise<UploadResult> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    Metadata: metadata,
  });

  const result = await s3Client.send(command);

  const url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;

  return {
    url,
    key,
    bucket: BUCKET_NAME,
    etag: result.ETag,
  };
}

/**
 * Upload a large file to S3 with multipart upload and progress tracking
 * @param buffer - File buffer to upload
 * @param key - S3 object key (path)
 * @param contentType - MIME type of the file
 * @param metadata - Optional metadata to attach to the object
 * @param onProgress - Optional callback for progress updates
 * @returns Upload result with URL and key
 */
export async function uploadLargeFileToS3(
  buffer: Buffer,
  key: string,
  contentType: string,
  metadata?: Record<string, string>,
  onProgress?: (progress: { loaded: number; total: number; percentage: number }) => void
): Promise<UploadResult> {
  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      Metadata: metadata,
    },
    queueSize: 4,
    partSize: 1024 * 1024 * 5, // 5MB parts
    leavePartsOnError: false,
  });

  if (onProgress) {
    upload.on('httpUploadProgress', (progress) => {
      const loaded = progress.loaded || 0;
      const total = buffer.length;
      const percentage = (loaded / total) * 100;

      onProgress({ loaded, total, percentage });
    });
  }

  const result = await upload.done();

  const url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;

  return {
    url,
    key,
    bucket: BUCKET_NAME,
    etag: result.ETag,
  };
}

/**
 * Upload a video file to S3
 * @param buffer - Video file buffer
 * @param campaignId - Campaign ID for organizing files
 * @param filename - Original filename
 * @returns Upload result
 */
export async function uploadVideoToS3(
  buffer: Buffer,
  campaignId: string,
  filename: string
): Promise<UploadResult> {
  const timestamp = Date.now();
  const key = `campaigns/${campaignId}/videos/${timestamp}-${filename}`;

  return uploadLargeFileToS3(buffer, key, 'video/mp4', {
    campaignId,
    originalName: filename,
    uploadedAt: new Date().toISOString(),
  });
}

/**
 * Upload an image file to S3
 * @param buffer - Image file buffer
 * @param campaignId - Campaign ID for organizing files
 * @param filename - Original filename
 * @param sceneIndex - Optional scene index for organizing images
 * @returns Upload result
 */
export async function uploadImageToS3(
  buffer: Buffer,
  campaignId: string,
  filename: string,
  sceneIndex?: number
): Promise<UploadResult> {
  const timestamp = Date.now();
  const scenePrefix = sceneIndex !== undefined ? `scene-${sceneIndex}/` : '';
  const key = `campaigns/${campaignId}/images/${scenePrefix}${timestamp}-${filename}`;

  return uploadToS3(buffer, key, 'image/jpeg', {
    campaignId,
    originalName: filename,
    uploadedAt: new Date().toISOString(),
    ...(sceneIndex !== undefined && { sceneIndex: sceneIndex.toString() }),
  });
}

/**
 * Generate S3 URL from key
 * @param key - S3 object key
 * @returns Full S3 URL
 */
export function getS3Url(key: string): string {
  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
}

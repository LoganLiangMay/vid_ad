import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import axios from 'axios';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const db = admin.firestore();

// Initialize S3 client
const getS3Client = () => {
  const region = process.env.AWS_REGION || 'us-east-2';
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'AWS S3 credentials not configured'
    );
  }

  return new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
};

/**
 * Upload video from URL to S3
 */
export const uploadVideoToS3 = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated'
    );
  }

  const {
    videoUrl,
    campaignId,
    videoId,
    thumbnailUrl,
  } = data;

  if (!videoUrl || !campaignId || !videoId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'videoUrl, campaignId, and videoId are required'
    );
  }

  try {
    const userId = context.auth.uid;
    const s3Client = getS3Client();
    const bucketName = process.env.AWS_S3_BUCKET_NAME;

    if (!bucketName) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'AWS S3 bucket name not configured'
      );
    }

    // Download video from Replicate URL
    console.log(`📥 Downloading video from ${videoUrl}`);
    const videoResponse = await axios.get(videoUrl, {
      responseType: 'arraybuffer',
      timeout: 300000, // 5 minute timeout
    });

    const videoBuffer = Buffer.from(videoResponse.data);
    const videoKey = `videos/${userId}/${campaignId}/${videoId}.mp4`;

    // Upload video to S3
    console.log(`📤 Uploading video to S3: ${videoKey}`);
    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: videoKey,
      Body: videoBuffer,
      ContentType: 'video/mp4',
      ServerSideEncryption: 'AES256',
      Metadata: {
        userId,
        campaignId,
        videoId,
        uploadedAt: new Date().toISOString(),
      },
    }));

    // Generate S3 URL (or use CloudFront if configured)
    const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN_NAME;
    const s3VideoUrl = cloudFrontDomain
      ? `https://${cloudFrontDomain}/${videoKey}`
      : `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-2'}.amazonaws.com/${videoKey}`;

    let s3ThumbnailUrl = thumbnailUrl;

    // Upload thumbnail if provided
    if (thumbnailUrl) {
      try {
        console.log(`📥 Downloading thumbnail from ${thumbnailUrl}`);
        const thumbnailResponse = await axios.get(thumbnailUrl, {
          responseType: 'arraybuffer',
          timeout: 30000,
        });

        const thumbnailBuffer = Buffer.from(thumbnailResponse.data);
        const thumbnailKey = `thumbnails/${userId}/${campaignId}/${videoId}.jpg`;

        console.log(`📤 Uploading thumbnail to S3: ${thumbnailKey}`);
        await s3Client.send(new PutObjectCommand({
          Bucket: bucketName,
          Key: thumbnailKey,
          Body: thumbnailBuffer,
          ContentType: 'image/jpeg',
          ServerSideEncryption: 'AES256',
          Metadata: {
            userId,
            campaignId,
            videoId,
          },
        }));

        s3ThumbnailUrl = cloudFrontDomain
          ? `https://${cloudFrontDomain}/${thumbnailKey}`
          : `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-2'}.amazonaws.com/${thumbnailKey}`;
      } catch (thumbnailError) {
        console.warn('Failed to upload thumbnail, using original URL:', thumbnailError);
      }
    }

    // Update campaign with S3 URLs
    const campaignRef = db.collection('campaigns').doc(campaignId);
    const campaignDoc = await campaignRef.get();

    if (campaignDoc.exists) {
      const campaignData = campaignDoc.data();
      const videos = campaignData?.videos || [];
      const videoIndex = videos.findIndex((v: any) => v.id === videoId);

      const updatedVideo = {
        id: videoId,
        url: s3VideoUrl,
        thumbnail: s3ThumbnailUrl || thumbnailUrl,
        status: 'completed',
        s3Key: videoKey,
        uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (videoIndex >= 0) {
        videos[videoIndex] = { ...videos[videoIndex], ...updatedVideo };
      } else {
        videos.push(updatedVideo);
      }

      await campaignRef.update({
        videos,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return {
      success: true,
      videoUrl: s3VideoUrl,
      thumbnailUrl: s3ThumbnailUrl,
      s3Key: videoKey,
    };
  } catch (error: any) {
    console.error('Error uploading video to S3:', error);
    throw new functions.https.HttpsError(
      'internal',
      `Failed to upload video to S3: ${error.message}`
    );
  }
});

/**
 * Upload scene image from URL to S3
 */
export const uploadImageToS3 = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated'
    );
  }

  const {
    imageUrl,
    campaignId,
    sceneId,
    sceneNumber,
  } = data;

  if (!imageUrl || !campaignId || !sceneId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'imageUrl, campaignId, and sceneId are required'
    );
  }

  try {
    const userId = context.auth.uid;
    const s3Client = getS3Client();
    const bucketName = process.env.AWS_S3_BUCKET_NAME;

    if (!bucketName) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'AWS S3 bucket name not configured'
      );
    }

    // Download image from Replicate URL
    console.log(`📥 Downloading scene image from ${imageUrl}`);
    const imageResponse = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 60000, // 1 minute timeout
    });

    const imageBuffer = Buffer.from(imageResponse.data);
    const imageKey = `scenes/${userId}/${campaignId}/scene-${sceneNumber || sceneId}.jpg`;

    // Upload image to S3
    console.log(`📤 Uploading scene image to S3: ${imageKey}`);
    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: imageKey,
      Body: imageBuffer,
      ContentType: 'image/jpeg',
      ServerSideEncryption: 'AES256',
      Metadata: {
        userId,
        campaignId,
        sceneId,
        sceneNumber: String(sceneNumber || ''),
        uploadedAt: new Date().toISOString(),
      },
    }));

    // Generate S3 URL (or use CloudFront if configured)
    const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN_NAME;
    const s3ImageUrl = cloudFrontDomain
      ? `https://${cloudFrontDomain}/${imageKey}`
      : `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-2'}.amazonaws.com/${imageKey}`;

    return {
      success: true,
      imageUrl: s3ImageUrl,
      s3Key: imageKey,
      sceneId,
      sceneNumber,
    };
  } catch (error: any) {
    console.error('Error uploading image to S3:', error);
    throw new functions.https.HttpsError(
      'internal',
      `Failed to upload image to S3: ${error.message}`
    );
  }
});


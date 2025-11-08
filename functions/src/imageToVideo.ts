import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import Replicate from 'replicate';

const db = admin.firestore();

// Initialize Replicate client
const getReplicateClient = () => {
  const apiToken = process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY;

  if (!apiToken) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Replicate API token not configured'
    );
  }

  return new Replicate({ auth: apiToken });
};

/**
 * Generate video from a single image using Kling 2.5 Turbo Pro
 * Simple image-to-video with prompt and negative prompt
 */
export const generateImageToVideo = functions.https.onCall(async (data, context) => {
  const userId = context.auth?.uid || 'anonymous-user';

  try {
    const {
      imageUrl,           // Starting image URL
      prompt,             // Text prompt describing desired video
      negativePrompt,     // Things to avoid
      duration = 5,       // 5 or 10 seconds
      aspectRatio = '9:16',  // '16:9', '9:16', or '1:1' - ignored if start_image provided
    } = data;

    if (!imageUrl || !prompt) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'imageUrl and prompt are required'
      );
    }

    console.log('🎬 Starting Kling image-to-video generation');
    console.log(`📸 Image: ${imageUrl}`);
    console.log(`📝 Prompt: ${prompt}`);
    console.log(`⏱️ Duration: ${duration}s`);

    const replicate = getReplicateClient();

    // Build input for Kling 2.5 Turbo Pro
    const input: any = {
      prompt,
      start_image: imageUrl,
      duration,
      aspect_ratio: aspectRatio,  // This is ignored when start_image is provided
    };

    // Add negative prompt if provided
    if (negativePrompt) {
      input.negative_prompt = negativePrompt;
      console.log(`🚫 Negative prompt: ${negativePrompt}`);
    }

    // Start prediction
    const prediction = await replicate.predictions.create({
      version: await getKlingVersion(replicate),
      input,
    });

    console.log(`✅ Prediction created: ${prediction.id}`);

    // Store video generation info in Firestore
    const videoRef = db.collection('imageToVideoGenerations').doc();
    const videoId = videoRef.id;

    const videoData = {
      id: videoId,
      userId,
      predictionId: prediction.id,
      model: 'kwaivgi/kling-v2.5-turbo-pro',
      status: prediction.status || 'starting',
      type: 'image-to-video',
      input: {
        imageUrl,
        prompt,
        negativePrompt: negativePrompt || null,
        duration,
        aspectRatio,
      },
      output: null,
      error: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await videoRef.set(videoData);

    return {
      success: true,
      videoId,
      predictionId: prediction.id,
      status: prediction.status,
      message: 'Video generation started successfully',
    };
  } catch (error: any) {
    console.error('❌ Error generating image-to-video:', error);
    throw new functions.https.HttpsError(
      'internal',
      `Failed to generate video: ${error.message}`
    );
  }
});

/**
 * Check status of image-to-video generation
 */
export const checkImageToVideoStatus = functions.https.onCall(async (data, context) => {
  const userId = context.auth?.uid || 'anonymous-user';

  try {
    const { videoId } = data;

    if (!videoId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'videoId is required'
      );
    }

    console.log(`📊 Checking status for video ${videoId}`);

    // Get video document from Firestore
    const videoRef = db.collection('imageToVideoGenerations').doc(videoId);
    const videoDoc = await videoRef.get();

    if (!videoDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Video not found'
      );
    }

    const videoData = videoDoc.data();

    // Verify ownership (skip for anonymous users during testing)
    if (userId !== 'anonymous-user' && videoData?.userId !== userId) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Not authorized to access this video'
      );
    }

    const replicate = getReplicateClient();

    // Get prediction status from Replicate
    const prediction = await replicate.predictions.get(videoData!.predictionId);

    console.log(`📊 Video ${videoId}: ${prediction.status}`);

    // Update Firestore with latest status
    await videoRef.update({
      status: prediction.status,
      output: prediction.output || null,
      error: prediction.error || null,
      logs: prediction.logs || null,
      metrics: prediction.metrics || null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      videoId,
      status: prediction.status,
      output: prediction.output,
      error: prediction.error,
      logs: prediction.logs,
      input: videoData!.input,
    };
  } catch (error: any) {
    console.error('❌ Error checking video status:', error);

    // If it's already an HttpsError, rethrow it
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      'internal',
      `Failed to check video status: ${error.message}`
    );
  }
});

/**
 * Get Kling 2.5 Turbo Pro model version
 */
async function getKlingVersion(replicate: Replicate): Promise<string> {
  // Hardcoded version ID for Kling 2.5 Turbo Pro
  // Updated: 2025-01-07
  const KLING_VERSION = '939cd1851c5b112f284681b57ee9b0f36d0f913ba97de5845a7eef92d52837df';

  try {
    console.log('✅ Using Kling 2.5 Turbo Pro version:', KLING_VERSION);
    return KLING_VERSION;
  } catch (error) {
    console.warn('⚠️ Hardcoded version might be outdated, fetching from API...');

    try {
      const model = await replicate.models.get('kwaivgi', 'kling-v2.5-turbo-pro');
      if (model.latest_version?.id) {
        console.log(`✅ Retrieved version from API: ${model.latest_version.id}`);
        return model.latest_version.id;
      }
    } catch (apiError) {
      console.error('❌ Failed to get version from API, using hardcoded version');
    }

    return KLING_VERSION;
  }
}

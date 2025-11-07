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
 * Generate video transitions between scene images using Kling 2.5 Turbo Pro
 * Each video transitions from one image to the next, creating a flowing narrative
 */
export const generateKlingTransitions = functions.https.onCall(async (data, context) => {
  const userId = context.auth?.uid || 'anonymous-user';

  try {
    const {
      campaignId,
      scenes,  // Array of { id, url, prompt, sceneNumber, description, mood }
      duration = 5,  // 5 or 10 seconds
      aspectRatio = '9:16',  // '16:9', '9:16', or '1:1'
    } = data;

    if (!campaignId || !scenes || scenes.length < 2) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'campaignId and at least 2 scenes are required'
      );
    }

    console.log(`🎬 Starting Kling transitions for ${scenes.length} scenes`);
    console.log(`📊 Will generate ${scenes.length - 1} transition videos`);

    const replicate = getReplicateClient();
    const transitionVideos = [];

    // Generate N-1 transition videos for N scenes
    for (let i = 0; i < scenes.length - 1; i++) {
      const currentScene = scenes[i];
      const nextScene = scenes[i + 1];

      // Create transition prompt that describes movement from current to next scene
      const transitionPrompt = createTransitionPrompt(currentScene, nextScene);

      console.log(`🎥 Creating transition ${i + 1}/${scenes.length - 1}:`);
      console.log(`   From: Scene ${currentScene.sceneNumber} - ${currentScene.mood || 'N/A'}`);
      console.log(`   To: Scene ${nextScene.sceneNumber} - ${nextScene.mood || 'N/A'}`);
      console.log(`   Prompt: ${transitionPrompt}`);

      // Build input for Kling 2.5 Turbo Pro
      const input: any = {
        prompt: transitionPrompt,
        start_image: currentScene.url,  // Use current scene as starting frame
        duration,
        aspect_ratio: aspectRatio,
      };

      // Start prediction
      const prediction = await replicate.predictions.create({
        version: await getKlingVersion(replicate),
        input,
      });

      console.log(`✅ Prediction created: ${prediction.id}`);

      // Store video generation info
      const videoRef = db.collection('videoGenerations').doc();
      const videoId = videoRef.id;

      const videoData = {
        id: videoId,
        userId,
        campaignId,
        predictionId: prediction.id,
        model: 'kwaivgi/kling-v2.5-turbo-pro',
        status: prediction.status || 'starting',
        type: 'scene-transition',
        transitionIndex: i,
        fromScene: {
          id: currentScene.id,
          sceneNumber: currentScene.sceneNumber,
          imageUrl: currentScene.url,
        },
        toScene: {
          id: nextScene.id,
          sceneNumber: nextScene.sceneNumber,
          imageUrl: nextScene.url,
        },
        input,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await videoRef.set(videoData);

      transitionVideos.push({
        videoId,
        predictionId: prediction.id,
        transitionIndex: i,
        fromSceneNumber: currentScene.sceneNumber,
        toSceneNumber: nextScene.sceneNumber,
        status: prediction.status,
      });

      // Small delay to avoid rate limiting (if needed)
      if (i < scenes.length - 2) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Update campaign with video generation info
    const campaignRef = db.collection('campaigns').doc(campaignId);
    await campaignRef.update({
      status: 'generating',
      videos: transitionVideos,
      videoGenerationStartedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      campaignId,
      totalScenes: scenes.length,
      totalVideos: transitionVideos.length,
      videos: transitionVideos,
      message: `Started generation of ${transitionVideos.length} transition videos`,
    };
  } catch (error: any) {
    console.error('❌ Error generating Kling transitions:', error);
    throw new functions.https.HttpsError(
      'internal',
      `Failed to generate video transitions: ${error.message}`
    );
  }
});

/**
 * Check status of all transition videos for a campaign
 */
export const checkKlingTransitionsStatus = functions.https.onCall(async (data, context) => {
  const userId = context.auth?.uid || 'anonymous-user';

  try {
    const { campaignId, videoIds } = data;

    if (!campaignId || !videoIds || !Array.isArray(videoIds)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'campaignId and videoIds array are required'
      );
    }

    console.log(`📊 Checking status for ${videoIds.length} videos in campaign ${campaignId}`);

    const replicate = getReplicateClient();
    const videoStatuses = [];

    for (const videoId of videoIds) {
      try {
        // Get video document from Firestore
        const videoRef = db.collection('videoGenerations').doc(videoId);
        const videoDoc = await videoRef.get();

        if (!videoDoc.exists) {
          console.warn(`⚠️ Video ${videoId} not found`);
          continue;
        }

        const videoData = videoDoc.data();

        // Verify ownership (skip for anonymous users during testing)
        if (userId !== 'anonymous-user' && videoData?.userId !== userId) {
          console.warn(`⚠️ User ${userId} not authorized for video ${videoId}`);
          continue;
        }

        // Get prediction status from Replicate
        const prediction = await replicate.predictions.get(videoData!.predictionId);

        console.log(`📊 Video ${videoId} (Transition ${videoData!.transitionIndex}): ${prediction.status}`);

        // Update Firestore
        await videoRef.update({
          status: prediction.status,
          output: prediction.output || null,
          error: prediction.error || null,
          logs: prediction.logs || null,
          metrics: prediction.metrics || null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        videoStatuses.push({
          videoId,
          transitionIndex: videoData!.transitionIndex,
          fromSceneNumber: videoData!.fromScene?.sceneNumber,
          toSceneNumber: videoData!.toScene?.sceneNumber,
          status: prediction.status,
          output: prediction.output,
          error: prediction.error,
        });
      } catch (videoError: any) {
        console.error(`❌ Error checking video ${videoId}:`, videoError);
        videoStatuses.push({
          videoId,
          status: 'error',
          error: videoError.message,
        });
      }
    }

    // Check if all videos are complete
    const allComplete = videoStatuses.every(v => v.status === 'succeeded');
    const anyFailed = videoStatuses.some(v => v.status === 'failed' || v.status === 'error');

    // Update campaign status
    const campaignRef = db.collection('campaigns').doc(campaignId);
    if (allComplete) {
      await campaignRef.update({
        status: 'completed',
        videoGenerationCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else if (anyFailed) {
      await campaignRef.update({
        status: 'failed',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return {
      success: true,
      campaignId,
      videos: videoStatuses,
      allComplete,
      anyFailed,
      completedCount: videoStatuses.filter(v => v.status === 'succeeded').length,
      totalCount: videoStatuses.length,
    };
  } catch (error: any) {
    console.error('❌ Error checking transition statuses:', error);
    throw new functions.https.HttpsError(
      'internal',
      `Failed to check video statuses: ${error.message}`
    );
  }
});

/**
 * Create a transition prompt that describes movement from one scene to the next
 */
function createTransitionPrompt(currentScene: any, nextScene: any): string {
  // Base transition elements
  const transitions = [];

  // Extract scene descriptions/moods
  const currentMood = currentScene.mood || currentScene.description || '';
  const nextMood = nextScene.mood || nextScene.description || '';

  // Create smooth transition description
  if (currentMood && nextMood) {
    transitions.push(`Smooth cinematic transition from ${currentMood} to ${nextMood}`);
  }

  // Add camera movement for dynamic transition
  const cameraMovements = [
    'camera slowly pans forward',
    'camera gently zooms in',
    'smooth camera movement',
    'cinematic camera motion',
    'gradual camera push',
  ];
  transitions.push(cameraMovements[Math.floor(Math.random() * cameraMovements.length)]);

  // Add quality descriptors
  transitions.push('high quality, cinematic lighting, smooth motion');

  const prompt = transitions.join(', ');

  // If original prompts exist, use them as context
  if (currentScene.prompt && nextScene.prompt) {
    return `${prompt}. Scene evolves from: ${currentScene.prompt.substring(0, 100)} towards: ${nextScene.prompt.substring(0, 100)}`;
  }

  return prompt;
}

/**
 * Get Kling 2.5 Turbo Pro model version
 */
async function getKlingVersion(replicate: Replicate): Promise<string> {
  // Hardcoded version ID for Kling 2.5 Turbo Pro
  // Updated: 2025-01-07
  const KLING_VERSION = '939cd1851c5b112f284681b57ee9b0f36d0f913ba97de5845a7eef92d52837df';

  // Try to get from API if hardcoded version fails
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

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
 * Generate video transitions between scene images using Google Veo 3.1 Fast
 * Uses true interpolation: each video starts with one scene image and ends with the next
 */
export const generateVeoTransitions = functions.https.onCall(async (data, context) => {
  const userId = context.auth?.uid || 'anonymous-user';

  try {
    const {
      campaignId,
      scenes,  // Array of { id, url, prompt, sceneNumber, description, mood }
      duration = 8,  // 4, 6, or 8 seconds
      aspectRatio = '16:9',  // '16:9' or '9:16'
      resolution = '720p',  // '720p' or '1080p'
      generateAudio = false,  // Generate audio with video
    } = data;

    if (!campaignId || !scenes || scenes.length < 2) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'campaignId and at least 2 scenes are required'
      );
    }

    // Validate duration
    if (![4, 6, 8].includes(duration)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'duration must be 4, 6, or 8 seconds'
      );
    }

    console.log(`🎬 Starting Veo 3.1 transitions for ${scenes.length} scenes`);
    console.log(`📊 Will generate ${scenes.length - 1} transition videos`);
    console.log(`⚙️ Settings: ${duration}s, ${aspectRatio}, ${resolution}, audio: ${generateAudio}`);

    const replicate = getReplicateClient();
    const transitionVideos = [];

    // Generate N-1 transition videos for N scenes
    for (let i = 0; i < scenes.length - 1; i++) {
      const currentScene = scenes[i];
      const nextScene = scenes[i + 1];

      // Create transition prompt that describes smooth interpolation
      const transitionPrompt = createVeoTransitionPrompt(currentScene, nextScene);

      console.log(`🎥 Creating transition ${i + 1}/${scenes.length - 1}:`);
      console.log(`   From: Scene ${currentScene.sceneNumber} - ${currentScene.mood || 'N/A'}`);
      console.log(`   To: Scene ${nextScene.sceneNumber} - ${nextScene.mood || 'N/A'}`);
      console.log(`   Prompt: ${transitionPrompt}`);

      // Build input for Veo 3.1 Fast
      // KEY: Both image (start) and last_frame (end) for true interpolation
      const input: any = {
        prompt: transitionPrompt,
        image: currentScene.url,  // Start frame
        last_frame: nextScene.url,  // End frame - THIS IS THE MAGIC!
        duration,
        aspect_ratio: aspectRatio,
        resolution,
        generate_audio: generateAudio,
      };

      // Start prediction
      const prediction = await replicate.predictions.create({
        version: await getVeoVersion(replicate),
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
        model: 'google/veo-3.1-fast',
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
        settings: {
          duration,
          aspectRatio,
          resolution,
          generateAudio,
        },
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

      // Small delay to avoid rate limiting
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
      message: `Started generation of ${transitionVideos.length} transition videos using Veo 3.1`,
      estimatedCostPerSecond: generateAudio ? 0.15 : 0.10,
      estimatedTotalCost: (transitionVideos.length * duration * (generateAudio ? 0.15 : 0.10)).toFixed(2),
    };
  } catch (error: any) {
    console.error('❌ Error generating Veo transitions:', error);
    throw new functions.https.HttpsError(
      'internal',
      `Failed to generate video transitions: ${error.message}`
    );
  }
});

/**
 * Check status of all transition videos for a campaign
 * Works with both Veo and Kling videos
 */
export const checkVeoTransitionsStatus = functions.https.onCall(async (data, context) => {
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
 * Create a transition prompt optimized for Veo 3.1 interpolation
 * Since we provide both start and end frames, the prompt guides the transition style
 */
function createVeoTransitionPrompt(currentScene: any, nextScene: any): string {
  const transitions = [];

  // Extract scene descriptions/moods
  const currentMood = currentScene.mood || currentScene.description || '';
  const nextMood = nextScene.mood || nextScene.description || '';

  // Describe the transition - Veo will interpolate between the two frames
  if (currentMood && nextMood) {
    transitions.push(`Smooth cinematic transition from ${currentMood} to ${nextMood}`);
  } else {
    transitions.push('Smooth cinematic transition between scenes');
  }

  // Add camera movement suggestions
  const cameraMovements = [
    'with gentle camera motion',
    'with subtle camera push',
    'with flowing camera movement',
    'with cinematic camera drift',
    'with seamless camera transition',
  ];
  transitions.push(cameraMovements[Math.floor(Math.random() * cameraMovements.length)]);

  // Add quality and style descriptors
  transitions.push('professional lighting, natural motion, high quality');

  const prompt = transitions.join(', ');

  // Add scene context if available
  if (currentScene.prompt && nextScene.prompt) {
    return `${prompt}. Transitioning from: ${currentScene.prompt.substring(0, 80)} to: ${nextScene.prompt.substring(0, 80)}`;
  }

  return prompt;
}

/**
 * Get Veo 3.1 Fast model version
 */
async function getVeoVersion(_replicate: Replicate): Promise<string> {
  // Hardcoded version ID for Veo 3.1 Fast
  // From: https://replicate.com/google/veo-3.1-fast
  const VEO_VERSION = '48ef609bb95db23e09ca4b8aff5ef18e5d22f0d3f8f1f07e1f92cd0077ea8ee9';

  try {
    console.log('✅ Using Veo 3.1 Fast version:', VEO_VERSION);
    return VEO_VERSION;
  } catch (error) {
    console.warn('⚠️ Using hardcoded Veo version');
    return VEO_VERSION;
  }
}

"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.composeVideoWithVoiceover = exports.updateVideoStatus = exports.processVideoGeneration = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
// Process video generation request
exports.processVideoGeneration = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { projectId, script, settings } = data;
    const userId = context.auth.uid;
    try {
        // Check user's credits
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();
        if (!userData || userData.subscription.creditsRemaining <= 0) {
            throw new functions.https.HttpsError('resource-exhausted', 'Insufficient credits');
        }
        // Create video document
        const videoRef = db.collection('videos').doc();
        const videoId = videoRef.id;
        await videoRef.set({
            id: videoId,
            projectId,
            userId,
            script,
            settings,
            status: 'queued',
            progress: 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            processingSteps: {
                scriptGeneration: 'pending',
                imageGeneration: 'pending',
                voiceGeneration: 'pending',
                videoComposition: 'pending',
                finalRendering: 'pending'
            }
        });
        // TODO: Trigger actual video processing pipeline
        // This would typically involve:
        // 1. GPT-4o for script enhancement
        // 2. DALL-E 3 for image generation
        // 3. OpenAI TTS for voice generation
        // 4. FFmpeg for video composition
        // 5. Upload to S3/CloudFront
        return {
            success: true,
            videoId,
            message: 'Video generation started'
        };
    }
    catch (error) {
        console.error('Error processing video generation:', error);
        throw new functions.https.HttpsError('internal', 'Failed to process video generation');
    }
});
// Update video processing status
exports.updateVideoStatus = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { videoId, status, progress, step } = data;
    const userId = context.auth.uid;
    try {
        const videoRef = db.collection('videos').doc(videoId);
        const videoDoc = await videoRef.get();
        if (!videoDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Video not found');
        }
        const videoData = videoDoc.data();
        if (videoData?.userId !== userId) {
            throw new functions.https.HttpsError('permission-denied', 'Not authorized to update this video');
        }
        const updateData = {
            status,
            progress,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        if (step) {
            updateData[`processingSteps.${step}`] = status;
        }
        await videoRef.update(updateData);
        return { success: true };
    }
    catch (error) {
        console.error('Error updating video status:', error);
        throw new functions.https.HttpsError('internal', 'Failed to update video status');
    }
});
/**
 * Compose video with voiceover using FFmpeg
 */
exports.composeVideoWithVoiceover = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { videoUrl, voiceoverUrl, videoVolume = 1.0, voiceoverVolume = 1.0, } = data;
    if (!videoUrl || !voiceoverUrl) {
        throw new functions.https.HttpsError('invalid-argument', 'videoUrl and voiceoverUrl are required');
    }
    try {
        const startTime = Date.now();
        // Note: FFmpeg processing would go here
        // For now, we'll return a placeholder that indicates composition is needed
        // Full FFmpeg implementation would require:
        // 1. Download video and audio files
        // 2. Use fluent-ffmpeg to combine them
        // 3. Adjust volumes
        // 4. Upload composed video to Firebase Storage
        // 5. Return composed video URL
        // TODO: Implement full FFmpeg composition
        // This is a placeholder that shows the structure
        console.log('🎬 Video composition requested:', {
            videoUrl,
            voiceoverUrl,
            videoVolume,
            voiceoverVolume,
        });
        // For now, return the video URL as-is
        // In production, this would:
        // 1. Download video from URL
        // 2. Download voiceover from URL
        // 3. Use FFmpeg to combine: ffmpeg -i video.mp4 -i voiceover.mp3 -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 output.mp4
        // 4. Upload to Firebase Storage
        // 5. Return composed URL
        const compositionTime = Date.now() - startTime;
        return {
            success: true,
            composedVideoUrl: videoUrl, // Placeholder - would be actual composed video
            compositionTime,
            message: 'Video composition completed (placeholder - FFmpeg implementation needed)',
        };
    }
    catch (error) {
        console.error('Error composing video:', error);
        throw new functions.https.HttpsError('internal', `Failed to compose video: ${error.message}`);
    }
});
//# sourceMappingURL=video.js.map
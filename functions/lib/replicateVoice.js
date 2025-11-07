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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renameClonedVoice = exports.deleteClonedVoice = exports.getUserClonedVoices = exports.cloneVoice = exports.generateReplicateVoiceover = exports.getReplicateDefaultVoices = exports.discoverReplicateVoiceModels = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const replicate_1 = __importDefault(require("replicate"));
const db = admin.firestore();
// Initialize Replicate client (reuse from existing setup)
const getReplicateClient = () => {
    const apiToken = process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY;
    if (!apiToken) {
        throw new functions.https.HttpsError('failed-precondition', 'Replicate API token not configured');
    }
    return new replicate_1.default({ auth: apiToken });
};
// Voice model identifiers for Replicate
const VOICE_MODELS = {
    MINIMAX_CLONING: 'minimax/voice-cloning',
    RESEMBLE_CHATTERBOX: 'resemble-ai/chatterbox-multilingual',
    OPENVOICE: 'openvoice/openvoice',
};
/**
 * Discover available voice models on Replicate
 */
exports.discoverReplicateVoiceModels = functions.https.onCall(async (_data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    try {
        const replicate = getReplicateClient();
        const models = [];
        // Search for voice-related models
        const searchTerms = ['voice', 'tts', 'text-to-speech', 'speech'];
        for (const term of searchTerms) {
            try {
                const results = await replicate.models.list();
                // Filter results by term in name or description
                const filtered = results.results?.filter((model) => model.name?.toLowerCase().includes(term) ||
                    model.description?.toLowerCase().includes(term)) || [];
                if (filtered.length > 0) {
                    models.push(...filtered);
                }
            }
            catch (error) {
                console.warn(`Error searching for ${term}:`, error);
            }
        }
        // Filter and format results
        const voiceModels = models
            .filter((model) => model.name?.toLowerCase().includes('voice') ||
            model.name?.toLowerCase().includes('tts') ||
            model.name?.toLowerCase().includes('speech'))
            .map((model) => ({
            id: `${model.owner}/${model.name}`,
            name: model.name,
            description: model.description,
            owner: model.owner,
            latestVersion: model.latest_version?.id,
        }))
            .slice(0, 20); // Limit to 20 results
        return {
            success: true,
            models: voiceModels,
        };
    }
    catch (error) {
        console.error('Error discovering voice models:', error);
        throw new functions.https.HttpsError('internal', `Failed to discover voice models: ${error.message}`);
    }
});
/**
 * Get available default voices from Replicate models
 */
exports.getReplicateDefaultVoices = functions.https.onCall(async (_data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    try {
        // For now, return a curated list of known Replicate voice models
        // In the future, this could query the API for available voices
        const defaultVoices = [
            {
                id: 'minimax-default-1',
                name: 'Minimax Professional Male',
                description: 'Professional male voice with clear pronunciation',
                gender: 'male',
                model: VOICE_MODELS.MINIMAX_CLONING,
            },
            {
                id: 'minimax-default-2',
                name: 'Minimax Professional Female',
                description: 'Professional female voice with warm tone',
                gender: 'female',
                model: VOICE_MODELS.MINIMAX_CLONING,
            },
            {
                id: 'resemble-multilingual-1',
                name: 'Resemble Multilingual (English)',
                description: 'Natural multilingual voice, English accent',
                gender: 'neutral',
                accent: 'english',
                model: VOICE_MODELS.RESEMBLE_CHATTERBOX,
            },
            {
                id: 'openvoice-default-1',
                name: 'OpenVoice Standard',
                description: 'Versatile voice with good clarity',
                gender: 'neutral',
                model: VOICE_MODELS.OPENVOICE,
            },
        ];
        return {
            success: true,
            voices: defaultVoices,
        };
    }
    catch (error) {
        console.error('Error getting default voices:', error);
        throw new functions.https.HttpsError('internal', `Failed to get default voices: ${error.message}`);
    }
});
/**
 * Generate voiceover using Replicate
 */
exports.generateReplicateVoiceover = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { text, voiceType, // 'default' | 'cloned'
    voiceId, speed = 1.0, model = VOICE_MODELS.MINIMAX_CLONING, } = data;
    if (!text || !voiceType || !voiceId) {
        throw new functions.https.HttpsError('invalid-argument', 'text, voiceType, and voiceId are required');
    }
    try {
        const replicate = getReplicateClient();
        const userId = context.auth.uid;
        const startTime = Date.now();
        // Build input for Replicate voice model
        const input = {
            text,
            voice_id: voiceId,
        };
        // Add speed if supported by model
        if (speed && speed !== 1.0) {
            input.speed = speed;
        }
        // Start prediction
        const prediction = await replicate.predictions.create({
            version: await getModelVersion(model, replicate),
            input,
        });
        console.log(`🎙️ Voiceover generation started: ${prediction.id}`);
        // Poll for completion
        let completed = false;
        let attempts = 0;
        const maxAttempts = 60; // 5 minutes max
        while (!completed && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
            const status = await replicate.predictions.get(prediction.id);
            if (status.status === 'succeeded') {
                completed = true;
                // Get audio URL from output
                const audioUrl = Array.isArray(status.output)
                    ? status.output[0]
                    : typeof status.output === 'string'
                        ? status.output
                        : null;
                if (!audioUrl) {
                    throw new Error('No audio URL in prediction output');
                }
                // Upload to Firebase Storage
                const bucket = admin.storage().bucket();
                const fileName = `voiceovers/${userId}/${Date.now()}.mp3`;
                const file = bucket.file(fileName);
                // Download from Replicate and upload to Firebase
                const response = await fetch(audioUrl);
                const buffer = Buffer.from(await response.arrayBuffer());
                await file.save(buffer, {
                    metadata: {
                        contentType: 'audio/mpeg',
                        metadata: {
                            userId,
                            voiceType,
                            voiceId,
                            model,
                            speed: speed.toString(),
                        },
                    },
                });
                // Get signed URL
                const [signedUrl] = await file.getSignedUrl({
                    action: 'read',
                    expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
                });
                const generationTime = Date.now() - startTime;
                // Store in Firestore
                const voiceoverDoc = await admin.firestore().collection('voiceovers').add({
                    userId,
                    text,
                    voiceType,
                    voiceId,
                    model,
                    speed,
                    audioUrl: signedUrl,
                    fileName,
                    generationTime,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                console.log(`✅ Voiceover generated: ${voiceoverDoc.id}`);
                return {
                    success: true,
                    voiceoverId: voiceoverDoc.id,
                    audioUrl: signedUrl,
                    generationTime,
                    voiceType,
                    voiceId,
                };
            }
            else if (status.status === 'failed') {
                throw new Error(status.error?.toString() || 'Voice generation failed');
            }
            attempts++;
        }
        throw new Error('Voice generation timeout');
    }
    catch (error) {
        console.error('Error generating voiceover:', error);
        throw new functions.https.HttpsError('internal', `Failed to generate voiceover: ${error.message}`);
    }
});
/**
 * Clone voice from audio file
 */
exports.cloneVoice = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { audioUrl, // URL to audio file in Firebase Storage
    voiceName, model = VOICE_MODELS.MINIMAX_CLONING, } = data;
    if (!audioUrl || !voiceName) {
        throw new functions.https.HttpsError('invalid-argument', 'audioUrl and voiceName are required');
    }
    // Validate voice name (must be unique per user)
    if (voiceName.trim().length === 0 || voiceName.length > 50) {
        throw new functions.https.HttpsError('invalid-argument', 'voiceName must be between 1 and 50 characters');
    }
    try {
        const replicate = getReplicateClient();
        const userId = context.auth.uid;
        // Check if voice name already exists for this user
        const existingVoice = await db
            .collection('users')
            .doc(userId)
            .collection('clonedVoices')
            .doc(voiceName)
            .get();
        if (existingVoice.exists) {
            throw new functions.https.HttpsError('already-exists', `Voice name "${voiceName}" already exists. Please choose a different name.`);
        }
        // Download audio from Firebase Storage
        const bucket = admin.storage().bucket();
        const file = bucket.file(audioUrl.replace(`gs://${bucket.name}/`, ''));
        const [audioBuffer] = await file.download();
        // Create voice clone via Replicate
        const input = {
            audio: audioBuffer,
            name: voiceName,
        };
        const prediction = await replicate.predictions.create({
            version: await getModelVersion(model, replicate),
            input,
        });
        console.log(`🎤 Voice cloning started: ${prediction.id}`);
        // Poll for completion
        let completed = false;
        let attempts = 0;
        const maxAttempts = 60; // 5 minutes max
        while (!completed && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            const status = await replicate.predictions.get(prediction.id);
            if (status.status === 'succeeded') {
                completed = true;
                const clonedVoiceId = typeof status.output === 'string'
                    ? status.output
                    : status.output?.voice_id || status.output;
                if (!clonedVoiceId) {
                    throw new Error('No voice ID in prediction output');
                }
                // Store in Firestore
                const clonedVoiceData = {
                    voiceName: voiceName.trim(),
                    replicateVoiceId: clonedVoiceId,
                    replicateModel: model,
                    audioUrl: audioUrl,
                    createdAt: admin.firestore.Timestamp.now(),
                    usageCount: 0,
                };
                await db
                    .collection('users')
                    .doc(userId)
                    .collection('clonedVoices')
                    .doc(voiceName.trim())
                    .set(clonedVoiceData);
                console.log(`✅ Voice cloned: ${voiceName} (${clonedVoiceId})`);
                return {
                    success: true,
                    voiceName: voiceName.trim(),
                    voiceId: clonedVoiceId,
                    model,
                };
            }
            else if (status.status === 'failed') {
                throw new Error(status.error?.toString() || 'Voice cloning failed');
            }
            attempts++;
        }
        throw new Error('Voice cloning timeout');
    }
    catch (error) {
        console.error('Error cloning voice:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', `Failed to clone voice: ${error.message}`);
    }
});
/**
 * Get user's cloned voices
 */
exports.getUserClonedVoices = functions.https.onCall(async (_data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    try {
        const userId = context.auth.uid;
        const clonedVoicesSnapshot = await db
            .collection('users')
            .doc(userId)
            .collection('clonedVoices')
            .get();
        const clonedVoices = clonedVoicesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));
        return {
            success: true,
            voices: clonedVoices,
        };
    }
    catch (error) {
        console.error('Error getting cloned voices:', error);
        throw new functions.https.HttpsError('internal', `Failed to get cloned voices: ${error.message}`);
    }
});
/**
 * Delete cloned voice
 */
exports.deleteClonedVoice = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { voiceName } = data;
    if (!voiceName) {
        throw new functions.https.HttpsError('invalid-argument', 'voiceName is required');
    }
    try {
        const userId = context.auth.uid;
        // Verify voice exists and belongs to user
        const voiceDoc = await db
            .collection('users')
            .doc(userId)
            .collection('clonedVoices')
            .doc(voiceName)
            .get();
        if (!voiceDoc.exists) {
            throw new functions.https.HttpsError('not-found', `Voice "${voiceName}" not found`);
        }
        // Delete voice document
        await db
            .collection('users')
            .doc(userId)
            .collection('clonedVoices')
            .doc(voiceName)
            .delete();
        console.log(`🗑️ Voice deleted: ${voiceName}`);
        return {
            success: true,
            message: `Voice "${voiceName}" deleted successfully`,
        };
    }
    catch (error) {
        console.error('Error deleting cloned voice:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', `Failed to delete cloned voice: ${error.message}`);
    }
});
/**
 * Rename cloned voice
 */
exports.renameClonedVoice = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { oldName, newName } = data;
    if (!oldName || !newName) {
        throw new functions.https.HttpsError('invalid-argument', 'oldName and newName are required');
    }
    if (newName.trim().length === 0 || newName.length > 50) {
        throw new functions.https.HttpsError('invalid-argument', 'newName must be between 1 and 50 characters');
    }
    try {
        const userId = context.auth.uid;
        // Verify old voice exists
        const oldVoiceDoc = await db
            .collection('users')
            .doc(userId)
            .collection('clonedVoices')
            .doc(oldName)
            .get();
        if (!oldVoiceDoc.exists) {
            throw new functions.https.HttpsError('not-found', `Voice "${oldName}" not found`);
        }
        // Check if new name already exists
        const newVoiceDoc = await db
            .collection('users')
            .doc(userId)
            .collection('clonedVoices')
            .doc(newName.trim())
            .get();
        if (newVoiceDoc.exists) {
            throw new functions.https.HttpsError('already-exists', `Voice name "${newName}" already exists`);
        }
        // Get old voice data
        const oldVoiceData = oldVoiceDoc.data();
        // Create new document with new name
        await db
            .collection('users')
            .doc(userId)
            .collection('clonedVoices')
            .doc(newName.trim())
            .set({
            ...oldVoiceData,
            voiceName: newName.trim(),
        });
        // Delete old document
        await db
            .collection('users')
            .doc(userId)
            .collection('clonedVoices')
            .doc(oldName)
            .delete();
        console.log(`✏️ Voice renamed: ${oldName} → ${newName}`);
        return {
            success: true,
            message: `Voice renamed from "${oldName}" to "${newName}"`,
        };
    }
    catch (error) {
        console.error('Error renaming cloned voice:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', `Failed to rename cloned voice: ${error.message}`);
    }
});
// Helper: Get model version (reuse from replicate.ts pattern)
async function getModelVersion(modelIdentifier, replicate) {
    // Known versions for voice models (update as needed)
    const KNOWN_VERSIONS = {
        [VOICE_MODELS.MINIMAX_CLONING]: 'latest', // Use latest for now
        [VOICE_MODELS.RESEMBLE_CHATTERBOX]: 'latest',
        [VOICE_MODELS.OPENVOICE]: 'latest',
    };
    // Try to get from API
    try {
        const parts = modelIdentifier.split('/');
        const owner = parts[0];
        const name = parts[1];
        if (owner && name) {
            const model = await replicate.models.get(owner, name);
            if (model.latest_version?.id) {
                return model.latest_version.id;
            }
        }
    }
    catch (error) {
        console.warn(`Could not fetch version for ${modelIdentifier}, using 'latest'`);
    }
    return KNOWN_VERSIONS[modelIdentifier] || 'latest';
}
//# sourceMappingURL=replicateVoice.js.map
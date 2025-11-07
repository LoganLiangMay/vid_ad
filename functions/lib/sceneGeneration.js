"use strict";
/**
 * Firebase Cloud Functions for AI-powered scene generation
 * Replaces Next.js API routes for static export compatibility
 */
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
exports.regenerateScene = exports.generateScenes = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const replicate_1 = __importDefault(require("replicate"));
const aiSceneGenerator_1 = require("./aiSceneGenerator");
// ============================================
// GENERATE SCENES FUNCTION
// ============================================
exports.generateScenes = functions
    .runWith({
    timeoutSeconds: 540,
    memory: '2GB',
})
    .https.onRequest(async (req, res) => {
    // CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    // Handle OPTIONS for CORS preflight
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    // Only allow POST
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    try {
        const body = req.body;
        const { prompt, numberOfScenes = 5, formData } = body;
        // Check for required API keys
        if (!process.env.REPLICATE_API_TOKEN) {
            res.status(500).json({ error: 'REPLICATE_API_TOKEN not configured' });
            return;
        }
        if (!process.env.OPENAI_API_KEY) {
            console.warn('⚠️ OPENAI_API_KEY not configured - using simple prompts');
        }
        let images;
        let enhancedWithFormData = false;
        let aiPowered = false;
        // Initialize AI Scene Generator
        if (formData && typeof formData === 'object') {
            console.log('🎨 Generating with AI-powered form data');
            enhancedWithFormData = true;
            try {
                const generator = new aiSceneGenerator_1.AISceneGenerator();
                const userPrompt = `${formData.productName}: ${formData.productDescription}`;
                // Use AI generator with enhanced context
                images = await generator.generateSceneImages(userPrompt, numberOfScenes, {
                    productName: formData.productName,
                    productDescription: formData.productDescription,
                    keywords: formData.keywords,
                    brandTone: formData.brandTone,
                    primaryColor: formData.primaryColor,
                    targetAudience: formData.targetAudience,
                    callToAction: formData.callToAction,
                    orientation: formData.orientation,
                    duration: formData.duration,
                });
                aiPowered = !!process.env.OPENAI_API_KEY;
                console.log(`✅ AI-generated ${images.length} scenes successfully`);
            }
            catch (error) {
                console.error('❌ AI generation failed, falling back to simple mode:', error);
                // Fallback to simple prompts
                const userPrompt = `${formData.productName}: ${formData.productDescription}`;
                images = await generateSimpleScenes(userPrompt, numberOfScenes);
            }
        }
        else if (prompt && typeof prompt === 'string') {
            console.log('📝 Generating with AI-enhanced prompt');
            try {
                const generator = new aiSceneGenerator_1.AISceneGenerator();
                images = await generator.generateSceneImages(prompt, numberOfScenes);
                aiPowered = !!process.env.OPENAI_API_KEY;
            }
            catch (error) {
                console.error('❌ AI generation failed, falling back to simple mode:', error);
                images = await generateSimpleScenes(prompt, numberOfScenes);
            }
        }
        else {
            res.status(400).json({ error: 'Either prompt or formData is required' });
            return;
        }
        res.status(200).json({
            success: true,
            images: images,
            count: images.length,
            aiPowered: aiPowered,
            enhancedWithFormData: enhancedWithFormData,
        });
    }
    catch (error) {
        console.error('Error in generate-scenes:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate images',
        });
    }
});
// ============================================
// REGENERATE SCENE FUNCTION
// ============================================
exports.regenerateScene = functions
    .runWith({
    timeoutSeconds: 180,
    memory: '2GB',
})
    .https.onRequest(async (req, res) => {
    // CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    // Handle OPTIONS for CORS preflight
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    // Only allow POST
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    try {
        const body = req.body;
        const { originalPrompt, sceneNumber, customPrompt } = body;
        // Validation
        if (!originalPrompt || !sceneNumber) {
            res.status(400).json({
                error: 'originalPrompt and sceneNumber are required',
            });
            return;
        }
        // Check for required API keys
        if (!process.env.REPLICATE_API_TOKEN) {
            res.status(500).json({ error: 'REPLICATE_API_TOKEN not configured' });
            return;
        }
        const prompt = customPrompt || originalPrompt;
        const image = await generateSingleImage(prompt, sceneNumber);
        res.status(200).json({
            success: true,
            image: image,
            aiRefined: !!process.env.OPENAI_API_KEY && !customPrompt,
        });
    }
    catch (error) {
        console.error('Error in regenerate-scene:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to regenerate image',
        });
    }
});
// ============================================
// HELPER FUNCTIONS
// ============================================
async function generateSimpleScenes(userPrompt, numberOfScenes) {
    console.log(`🍌 Generating ${numberOfScenes} simple scene images...`);
    const sceneTypes = [
        'establishing shot, wide angle',
        'medium close-up, detail focus',
        'dynamic angle, action moment',
        'close-up, dramatic lighting',
        'final hero shot, epic reveal',
    ];
    const prompts = sceneTypes.slice(0, numberOfScenes).map((sceneType, index) => `${userPrompt}, scene ${index + 1} of ${numberOfScenes}, ${sceneType}, professional photography, cinematic, 9:16 vertical format, high quality`);
    const imagePromises = prompts.map((prompt, index) => generateSingleImage(prompt, index + 1));
    return await Promise.all(imagePromises);
}
async function generateSingleImage(prompt, sceneNumber) {
    const replicate = new replicate_1.default({
        auth: process.env.REPLICATE_API_TOKEN,
    });
    console.log(`🍌 Generating image ${sceneNumber}...`);
    try {
        const output = await replicate.run('google/nano-banana', {
            input: {
                prompt: prompt,
                aspect_ratio: '9:16',
                output_format: 'png',
                output_quality: 90,
            },
        });
        const imageUrl = Array.isArray(output) ? output[0] : output;
        console.log(`✅ Image ${sceneNumber} generated`);
        return {
            id: `scene-${sceneNumber}`,
            url: imageUrl,
            prompt: prompt,
            sceneNumber: sceneNumber,
        };
    }
    catch (error) {
        console.error(`❌ Error generating image ${sceneNumber}:`, error);
        throw error;
    }
}
//# sourceMappingURL=sceneGeneration.js.map
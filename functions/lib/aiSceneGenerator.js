"use strict";
/**
 * AI-Powered Scene Generation for Cloud Functions
 * Uses LangChain + OpenAI GPT-4o-mini to generate intelligent scene prompts
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AISceneGenerator = void 0;
const openai_1 = require("@langchain/openai");
const prompts_1 = require("@langchain/core/prompts");
const zod_1 = require("zod");
const replicate_1 = __importDefault(require("replicate"));
// ============================================
// SCENE SCHEMA
// ============================================
const SceneSchema = zod_1.z.object({
    sceneNumber: zod_1.z.number(),
    description: zod_1.z.string(),
    imagePrompt: zod_1.z.string(),
    videoPrompt: zod_1.z.string(), // Prompt for video generation from the image
    cameraAngle: zod_1.z.string(),
    lighting: zod_1.z.string(),
    mood: zod_1.z.string(),
});
const ScenePromptSchema = zod_1.z.object({
    scenes: zod_1.z.array(SceneSchema),
});
// ============================================
// AI SCENE GENERATOR CLASS
// ============================================
class AISceneGenerator {
    constructor() {
        this.model = new openai_1.ChatOpenAI({
            modelName: 'gpt-4o-mini',
            temperature: 0.8,
            openAIApiKey: process.env.OPENAI_API_KEY,
        });
        this.replicate = new replicate_1.default({
            auth: process.env.REPLICATE_API_TOKEN,
        });
    }
    /**
     * Generate scene prompts using AI
     */
    async generateScenePrompts(userPrompt, numberOfScenes, context) {
        console.log('🤖 AI generating scene prompts...');
        const contextSections = this.buildContextSections(context);
        const aspectRatio = this.getAspectRatio(context?.orientation);
        const promptTemplate = prompts_1.PromptTemplate.fromTemplate(`
You are a professional video director creating scenes for a video advertisement.

USER'S VIDEO CONCEPT:
"{userPrompt}"

${contextSections}

REQUIREMENTS:
1. Create {numberOfScenes} scenes that tell a complete story
2. Each scene should flow naturally to the next
3. Aspect ratio: ${aspectRatio}
4. Image prompts should be detailed and optimized for AI image generation
5. Include camera angles, lighting, and mood for each scene

OUTPUT FORMAT (JSON):
{{
  "scenes": [
    {{
      "sceneNumber": 1,
      "description": "Brief scene description",
      "imagePrompt": "Detailed prompt for image generation with visual style, composition, lighting",
      "videoPrompt": "Concise motion/animation prompt describing how this image should animate when converted to video (camera movement, subject motion, effects)",
      "cameraAngle": "Camera shot type (e.g., wide shot, close-up, tracking shot)",
      "lighting": "Lighting description (e.g., warm golden hour, dramatic shadows)",
      "mood": "Scene mood (e.g., energetic, mysterious, calm)"
    }}
  ]
}}

Generate {numberOfScenes} scenes now:
`);
        const formattedPrompt = await promptTemplate.format({
            userPrompt,
            numberOfScenes: numberOfScenes.toString(),
        });
        try {
            const response = await this.model.invoke(formattedPrompt);
            const content = typeof response.content === 'string'
                ? response.content
                : JSON.stringify(response.content);
            // Parse JSON response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in AI response');
            }
            const parsed = JSON.parse(jsonMatch[0]);
            const validated = ScenePromptSchema.parse(parsed);
            console.log(`✅ AI generated ${validated.scenes.length} scene prompts`);
            return validated;
        }
        catch (error) {
            console.error('❌ AI prompt generation failed:', error);
            // Fallback to simple prompts
            return this.generateFallbackPrompts(userPrompt, numberOfScenes);
        }
    }
    /**
     * Generate images from AI prompts
     */
    async generateSceneImages(userPrompt, numberOfScenes, context) {
        console.log('🎨 Generating AI-powered scene images...');
        // Get AI-generated prompts
        const scenePrompts = await this.generateScenePrompts(userPrompt, numberOfScenes, context);
        // Generate images in parallel
        const imagePromises = scenePrompts.scenes.map((scene) => this.generateSingleImage(scene, context?.orientation));
        return await Promise.all(imagePromises);
    }
    /**
     * Generate a single image using Replicate
     */
    async generateSingleImage(scene, orientation) {
        const aspectRatio = this.getAspectRatio(orientation);
        console.log(`🖼️ Generating scene ${scene.sceneNumber}...`);
        try {
            const output = await this.replicate.run('google/nano-banana', {
                input: {
                    prompt: scene.imagePrompt,
                    aspect_ratio: aspectRatio,
                    output_format: 'png',
                    output_quality: 90,
                },
            });
            const imageUrl = Array.isArray(output) ? output[0] : output;
            return {
                id: `scene-${scene.sceneNumber}`,
                url: imageUrl,
                prompt: scene.imagePrompt,
                videoPrompt: scene.videoPrompt,
                sceneNumber: scene.sceneNumber,
                description: scene.description,
                cameraAngle: scene.cameraAngle,
                lighting: scene.lighting,
                mood: scene.mood,
            };
        }
        catch (error) {
            console.error(`❌ Error generating scene ${scene.sceneNumber}:`, error);
            throw error;
        }
    }
    /**
     * Build enhanced context sections for the prompt
     */
    buildContextSections(context) {
        if (!context)
            return '';
        const sections = [];
        if (context.productName || context.productDescription) {
            sections.push(`
PRODUCT INFORMATION:
- Name: ${context.productName || 'Not specified'}
- Description: ${context.productDescription || 'Not specified'}
      `.trim());
        }
        if (context.brandTone) {
            const toneGuidelines = this.getBrandToneGuidelines(context.brandTone);
            sections.push(`
BRAND TONE: ${context.brandTone}
${toneGuidelines}
      `.trim());
        }
        if (context.targetAudience) {
            sections.push(`
TARGET AUDIENCE: ${context.targetAudience}
      `.trim());
        }
        if (context.keywords && context.keywords.length > 0) {
            sections.push(`
KEY THEMES: ${context.keywords.join(', ')}
      `.trim());
        }
        if (context.callToAction) {
            sections.push(`
CALL TO ACTION: ${context.callToAction}
      `.trim());
        }
        return sections.join('\n\n');
    }
    /**
     * Get brand tone visual guidelines
     */
    getBrandToneGuidelines(tone) {
        const guidelines = {
            professional: 'Clean lines, corporate settings, confident poses. Neutral colors with accent highlights.',
            casual: 'Relaxed environments, natural interactions, soft focus. Warm, inviting color palette.',
            playful: 'Dynamic compositions, vibrant colors, energetic movement. Fun, engaging visuals.',
            luxury: 'Elegant settings, premium materials, sophisticated lighting. Rich, deep color tones.',
            energetic: 'High-energy scenes, bold colors, dynamic camera angles. Fast-paced visual flow.',
            minimalist: 'Simple compositions, clean backgrounds, focused subject. Limited color palette.',
        };
        return guidelines[tone.toLowerCase()] || '';
    }
    /**
     * Get aspect ratio from orientation
     */
    getAspectRatio(orientation) {
        switch (orientation?.toLowerCase()) {
            case 'portrait':
                return '9:16';
            case 'landscape':
                return '16:9';
            case 'square':
                return '1:1';
            default:
                return '9:16'; // Default to portrait for mobile
        }
    }
    /**
     * Fallback to simple prompt generation
     */
    generateFallbackPrompts(userPrompt, numberOfScenes) {
        console.log('⚠️ Using fallback simple prompts');
        const sceneTypes = [
            { type: 'establishing shot, wide angle', camera: 'Wide shot', lighting: 'Natural daylight', mood: 'Inviting', motion: 'Slow forward dolly, revealing the scene' },
            { type: 'medium close-up, detail focus', camera: 'Medium close-up', lighting: 'Soft key light', mood: 'Focused', motion: 'Gentle zoom in to highlight details' },
            { type: 'dynamic angle, action moment', camera: 'Dutch angle', lighting: 'Dramatic side light', mood: 'Energetic', motion: 'Dynamic camera movement with subject in motion' },
            { type: 'close-up, dramatic lighting', camera: 'Close-up', lighting: 'Dramatic chiaroscuro', mood: 'Intense', motion: 'Subtle push in, dramatic reveal' },
            { type: 'final hero shot, epic reveal', camera: 'Hero shot', lighting: 'Golden hour glow', mood: 'Triumphant', motion: 'Slow circular orbit around subject' },
        ];
        const scenes = sceneTypes.slice(0, numberOfScenes).map((scene, index) => ({
            sceneNumber: index + 1,
            description: `${userPrompt} - ${scene.type}`,
            imagePrompt: `${userPrompt}, scene ${index + 1}, ${scene.type}, professional photography, cinematic, high quality`,
            videoPrompt: scene.motion,
            cameraAngle: scene.camera,
            lighting: scene.lighting,
            mood: scene.mood,
        }));
        return { scenes };
    }
}
exports.AISceneGenerator = AISceneGenerator;
//# sourceMappingURL=aiSceneGenerator.js.map
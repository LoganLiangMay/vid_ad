/**
 * AI-Powered Scene Generation for Cloud Functions
 * Uses LangChain + OpenAI GPT-4o-mini to generate intelligent scene prompts
 */

import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import Replicate from 'replicate';

// ============================================
// TYPES
// ============================================

interface EnhancedSceneContext {
  productName?: string;
  productDescription?: string;
  keywords?: string[];
  brandTone?: string;
  primaryColor?: string;
  targetAudience?: string;
  callToAction?: string;
  orientation?: string;
  duration?: number;
}

interface SceneImage {
  id: string;
  url: string;
  prompt: string;
  sceneNumber: number;
  description?: string;
  cameraAngle?: string;
  lighting?: string;
  mood?: string;
}

// ============================================
// SCENE SCHEMA
// ============================================

const SceneSchema = z.object({
  sceneNumber: z.number(),
  description: z.string(),
  imagePrompt: z.string(),
  cameraAngle: z.string(),
  lighting: z.string(),
  mood: z.string(),
});

const ScenePromptSchema = z.object({
  scenes: z.array(SceneSchema),
});

// ============================================
// AI SCENE GENERATOR CLASS
// ============================================

export class AISceneGenerator {
  private model: ChatOpenAI;
  private replicate: Replicate;

  constructor() {
    this.model = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.8,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    this.replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });
  }

  /**
   * Generate scene prompts using AI
   */
  async generateScenePrompts(
    userPrompt: string,
    numberOfScenes: number,
    context?: EnhancedSceneContext
  ) {
    console.log('🤖 AI generating scene prompts...');

    const contextSections = this.buildContextSections(context);
    const aspectRatio = this.getAspectRatio(context?.orientation);

    const promptTemplate = PromptTemplate.fromTemplate(`
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
    } catch (error) {
      console.error('❌ AI prompt generation failed:', error);
      // Fallback to simple prompts
      return this.generateFallbackPrompts(userPrompt, numberOfScenes);
    }
  }

  /**
   * Generate images from AI prompts
   */
  async generateSceneImages(
    userPrompt: string,
    numberOfScenes: number,
    context?: EnhancedSceneContext
  ): Promise<SceneImage[]> {
    console.log('🎨 Generating AI-powered scene images...');

    // Get AI-generated prompts
    const scenePrompts = await this.generateScenePrompts(
      userPrompt,
      numberOfScenes,
      context
    );

    // Generate images in parallel
    const imagePromises = scenePrompts.scenes.map((scene) =>
      this.generateSingleImage(scene, context?.orientation)
    );

    return await Promise.all(imagePromises);
  }

  /**
   * Generate a single image using Replicate
   */
  private async generateSingleImage(
    scene: z.infer<typeof SceneSchema>,
    orientation?: string
  ): Promise<SceneImage> {
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
        url: imageUrl as string,
        prompt: scene.imagePrompt,
        sceneNumber: scene.sceneNumber,
        description: scene.description,
        cameraAngle: scene.cameraAngle,
        lighting: scene.lighting,
        mood: scene.mood,
      };
    } catch (error) {
      console.error(`❌ Error generating scene ${scene.sceneNumber}:`, error);
      throw error;
    }
  }

  /**
   * Build enhanced context sections for the prompt
   */
  private buildContextSections(context?: EnhancedSceneContext): string {
    if (!context) return '';

    const sections: string[] = [];

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
  private getBrandToneGuidelines(tone: string): string {
    const guidelines: Record<string, string> = {
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
  private getAspectRatio(orientation?: string): '9:16' | '16:9' | '1:1' {
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
  private generateFallbackPrompts(userPrompt: string, numberOfScenes: number) {
    console.log('⚠️ Using fallback simple prompts');

    const sceneTypes = [
      { type: 'establishing shot, wide angle', camera: 'Wide shot', lighting: 'Natural daylight', mood: 'Inviting' },
      { type: 'medium close-up, detail focus', camera: 'Medium close-up', lighting: 'Soft key light', mood: 'Focused' },
      { type: 'dynamic angle, action moment', camera: 'Dutch angle', lighting: 'Dramatic side light', mood: 'Energetic' },
      { type: 'close-up, dramatic lighting', camera: 'Close-up', lighting: 'Dramatic chiaroscuro', mood: 'Intense' },
      { type: 'final hero shot, epic reveal', camera: 'Hero shot', lighting: 'Golden hour glow', mood: 'Triumphant' },
    ];

    const scenes = sceneTypes.slice(0, numberOfScenes).map((scene, index) => ({
      sceneNumber: index + 1,
      description: `${userPrompt} - ${scene.type}`,
      imagePrompt: `${userPrompt}, scene ${index + 1}, ${scene.type}, professional photography, cinematic, high quality`,
      cameraAngle: scene.camera,
      lighting: scene.lighting,
      mood: scene.mood,
    }));

    return { scenes };
  }
}

// ============================================
// LANGCHAIN AGENT FOR SCENE PROMPT GENERATION
// Uses OpenAI to intelligently generate scene prompts
// Enhanced with form context for high-quality outputs
// ============================================

import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import type { AdGenerationFormData } from './schemas/adGenerationSchema';

// ============================================
// SCENE PROMPT SCHEMA
// ============================================

const SceneSchema = z.object({
  sceneNumber: z.number().describe('Scene number (1-5)'),
  description: z.string().describe('Detailed scene description'),
  imagePrompt: z.string().describe('Optimized prompt for image generation'),
  cameraAngle: z.string().describe('Camera angle/shot type'),
  lighting: z.string().describe('Lighting description'),
  mood: z.string().describe('Scene mood/atmosphere'),
});

const ScenePromptSchema = z.object({
  scenes: z.array(SceneSchema),
});

type ScenePrompts = z.infer<typeof ScenePromptSchema>;

// ============================================
// ENHANCED CONTEXT TYPE
// Optional form data to enhance scene generation
// ============================================

export interface EnhancedSceneContext {
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

// ============================================
// LANGCHAIN SCENE PROMPT AGENT
// ============================================

export class ScenePromptAgent {
  private model: ChatOpenAI;

  constructor() {
    // Initialize OpenAI model with structured output
    this.model = new ChatOpenAI({
      modelName: 'gpt-4o-mini', // Fast and cost-effective
      temperature: 0.8, // Creative but controlled
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
  }

  // ============================================
  // GENERATE SCENE PROMPTS
  // ============================================

  async generateScenePrompts(
    userPrompt: string,
    numberOfScenes: number = 5,
    enhancedContext?: EnhancedSceneContext
  ): Promise<ScenePrompts> {
    console.log('🤖 LangChain Agent analyzing user prompt with enhanced context...');
    console.log(`📝 User input: "${userPrompt}"`);
    if (enhancedContext) {
      console.log('🎨 Enhanced context provided:', {
        product: enhancedContext.productName,
        tone: enhancedContext.brandTone,
        orientation: enhancedContext.orientation,
      });
    }

    // Build context sections for the prompt
    const contextSections = this.buildContextSections(enhancedContext);

    // Determine aspect ratio from orientation
    const aspectRatio = this.getAspectRatio(enhancedContext?.orientation);

    // Create the enhanced prompt template
    const promptTemplate = PromptTemplate.fromTemplate(`
You are a professional video director and cinematographer creating scenes for a video advertisement.

USER'S VIDEO CONCEPT:
"{userPrompt}"

${contextSections}

TECHNICAL REQUIREMENTS:
1. Create {numberOfScenes} scenes that tell a complete story
2. Each scene should have a distinct visual identity
3. Scenes should flow naturally from one to the next
4. Optimize for {aspectRatio} format
5. Focus on visual storytelling and emotional impact
6. Each scene should be suitable for image-to-video conversion
7. Duration per scene: approximately {sceneDuration} seconds

SCENE PROGRESSION GUIDELINES:
- Scene 1: Hook/Attention grabber - Establish the setting and immediately grab attention
- Scene 2: Introduction - Introduce the product/subject in context
- Scene 3: Build/Action - Showcase key features or create visual tension
- Scene 4: Climax/Highlight - Most dramatic or important moment
- Scene 5: Resolution/CTA - Satisfying conclusion with call-to-action energy

For each scene, provide:
- sceneNumber: The scene number (1-{numberOfScenes})
- description: A brief description of what happens in this scene
- imagePrompt: A highly detailed, optimized prompt for Nano Banana image generation (include composition, style, lighting, mood, colors, and brand tone)
- cameraAngle: The camera angle or shot type (e.g., "wide establishing shot", "close-up", "medium shot", "dramatic low angle")
- lighting: The lighting style (e.g., "golden hour", "dramatic shadows", "soft natural light", "studio lighting")
- mood: The emotional mood or atmosphere that matches the brand tone

Generate {numberOfScenes} compelling, brand-aligned scenes now.
`);

    try {
      // Create model with structured output
      const structuredModel = this.model.withStructuredOutput(ScenePromptSchema);

      // Calculate scene duration
      const sceneDuration = enhancedContext?.duration
        ? Math.round(enhancedContext.duration / numberOfScenes)
        : 1.4;

      // Format the prompt
      const formattedPrompt = await promptTemplate.format({
        userPrompt: userPrompt,
        numberOfScenes: numberOfScenes,
        aspectRatio: aspectRatio,
        sceneDuration: sceneDuration,
      });

      console.log('🚀 Sending request to OpenAI...');

      // Get structured response
      const parsedOutput = await structuredModel.invoke(formattedPrompt);

      console.log('✅ Received response from OpenAI');
      console.log(`✅ Generated ${parsedOutput.scenes.length} scene prompts`);

      return parsedOutput;
    } catch (error) {
      console.error('❌ Error generating scene prompts:', error);
      throw new Error(
        `Failed to generate scene prompts: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  // ============================================
  // REFINE SINGLE SCENE PROMPT
  // ============================================

  async refineScenePrompt(
    originalPrompt: string,
    sceneNumber: number,
    userFeedback?: string
  ): Promise<string> {
    console.log(`🔄 Refining scene ${sceneNumber} prompt...`);

    const refinementTemplate = PromptTemplate.fromTemplate(`
You are refining an image generation prompt for scene {sceneNumber} of a video.

ORIGINAL PROMPT:
"{originalPrompt}"

${
  userFeedback
    ? `USER FEEDBACK:\n"${userFeedback}"\n\nIncorporate this feedback into the refined prompt.`
    : 'Create a variation of this prompt with a fresh perspective while maintaining the core concept.'
}

REQUIREMENTS:
- Maintain consistency with the overall video concept
- Optimize for Nano Banana image generation
- Use vivid, descriptive language
- Specify composition, lighting, and mood
- Ensure 9:16 vertical format suitability

Provide ONLY the refined image prompt, nothing else.
`);

    try {
      const formattedPrompt = await refinementTemplate.format({
        sceneNumber: sceneNumber,
        originalPrompt: originalPrompt,
        userFeedback: userFeedback || '',
      });

      const response = await this.model.invoke(formattedPrompt);
      const refinedPrompt = (response.content as string).trim();

      console.log(`✅ Refined prompt: "${refinedPrompt}"`);

      return refinedPrompt;
    } catch (error) {
      console.error('❌ Error refining prompt:', error);
      throw new Error(`Failed to refine prompt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private buildContextSections(context?: EnhancedSceneContext): string {
    if (!context) return '';

    const sections: string[] = [];

    if (context.productName && context.productDescription) {
      sections.push(`PRODUCT INFORMATION:
Product: ${context.productName}
Description: ${context.productDescription}`);
    }

    if (context.keywords && context.keywords.length > 0) {
      sections.push(`KEY THEMES & KEYWORDS:
${context.keywords.join(', ')}`);
    }

    if (context.brandTone) {
      const toneGuidelines = this.getBrandToneGuidelines(context.brandTone);
      sections.push(`BRAND TONE: ${context.brandTone.toUpperCase()}
${toneGuidelines}`);
    }

    if (context.primaryColor) {
      sections.push(`PRIMARY BRAND COLOR: ${context.primaryColor}
Incorporate this color palette in lighting, backgrounds, or product styling when appropriate.`);
    }

    if (context.targetAudience) {
      sections.push(`TARGET AUDIENCE:
${context.targetAudience}
Tailor visual style and mood to resonate with this demographic.`);
    }

    if (context.callToAction) {
      sections.push(`CALL TO ACTION:
"${context.callToAction}"
Build visual momentum toward this final message in the last scene.`);
    }

    return sections.join('\n\n');
  }

  private getBrandToneGuidelines(tone: string): string {
    const guidelines: Record<string, string> = {
      professional:
        'Clean, polished aesthetics. Corporate settings. Confident, authoritative mood. Neutral or cool color tones.',
      casual:
        'Relaxed, approachable settings. Natural lighting. Friendly, comfortable mood. Warm, inviting colors.',
      playful:
        'Dynamic, energetic compositions. Bright, vibrant lighting. Fun, lighthearted mood. Bold, saturated colors.',
      luxury:
        'Elegant, sophisticated settings. Dramatic, high-contrast lighting. Aspirational, exclusive mood. Rich, premium colors.',
      energetic:
        'Fast-paced, action-oriented compositions. High-key lighting. Exciting, motivational mood. Vivid, high-energy colors.',
      minimalist:
        'Simple, uncluttered compositions. Soft, even lighting. Calm, focused mood. Monochromatic or muted color palette.',
    };

    return guidelines[tone.toLowerCase()] || '';
  }

  private getAspectRatio(orientation?: string): string {
    switch (orientation?.toLowerCase()) {
      case 'portrait':
        return '9:16 vertical (mobile-optimized)';
      case 'square':
        return '1:1 square (social media)';
      case 'landscape':
      default:
        return '16:9 horizontal (widescreen)';
    }
  }

  // ============================================
  // VALIDATE API KEY
  // ============================================

  static validateApiKey(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Generate scene prompts using LangChain agent with optional enhanced context
 */
export async function generateScenePromptsWithAI(
  userPrompt: string,
  numberOfScenes: number = 5,
  enhancedContext?: EnhancedSceneContext
): Promise<ScenePrompts> {
  if (!ScenePromptAgent.validateApiKey()) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const agent = new ScenePromptAgent();
  return await agent.generateScenePrompts(userPrompt, numberOfScenes, enhancedContext);
}

/**
 * Generate scene prompts from full form data
 */
export async function generateScenePromptsFromFormData(
  formData: AdGenerationFormData,
  numberOfScenes: number = 5
): Promise<ScenePrompts> {
  // Build user prompt from product description
  const userPrompt = `${formData.productName}: ${formData.productDescription}`;

  // Extract enhanced context from form data
  const enhancedContext: EnhancedSceneContext = {
    productName: formData.productName,
    productDescription: formData.productDescription,
    keywords: Array.isArray(formData.keywords) ? formData.keywords : [],
    brandTone: formData.brandTone,
    primaryColor: formData.primaryColor,
    targetAudience: formData.targetAudience,
    callToAction: formData.callToAction,
    orientation: formData.orientation,
    duration: formData.duration,
  };

  return generateScenePromptsWithAI(userPrompt, numberOfScenes, enhancedContext);
}

/**
 * Refine a single scene prompt with optional feedback
 */
export async function refineScenePromptWithAI(
  originalPrompt: string,
  sceneNumber: number,
  userFeedback?: string
): Promise<string> {
  if (!ScenePromptAgent.validateApiKey()) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const agent = new ScenePromptAgent();
  return await agent.refineScenePrompt(originalPrompt, sceneNumber, userFeedback);
}

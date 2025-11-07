// ============================================
// LANGCHAIN AGENT FOR SCENE PROMPT GENERATION
// Uses OpenAI to intelligently generate scene prompts
// ============================================

import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';

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
    numberOfScenes: number = 5
  ): Promise<ScenePrompts> {
    console.log('🤖 LangChain Agent analyzing user prompt...');
    console.log(`📝 User input: "${userPrompt}"`);

    // Create the prompt template
    const promptTemplate = PromptTemplate.fromTemplate(`
You are a professional video director and cinematographer. Your job is to break down a user's video concept into {numberOfScenes} distinct, visually compelling scenes that will work together as a cohesive video advertisement.

USER'S VIDEO CONCEPT:
"{userPrompt}"

REQUIREMENTS:
1. Create {numberOfScenes} scenes that tell a complete story
2. Each scene should have a distinct visual identity
3. Scenes should flow naturally from one to the next
4. Optimize for vertical 9:16 format (mobile video)
5. Focus on visual storytelling and emotional impact
6. Each scene should be suitable for image-to-video conversion

SCENE PROGRESSION GUIDELINES:
- Scene 1: Hook/Attention grabber - Establish the setting and grab attention
- Scene 2: Introduction - Introduce the subject/product in context
- Scene 3: Build/Action - Show key features or create tension
- Scene 4: Climax/Highlight - Most dramatic or important moment
- Scene 5: Resolution/CTA - Satisfying conclusion or call-to-action moment

For each scene, provide:
- sceneNumber: The scene number (1-{numberOfScenes})
- description: A brief description of what happens in this scene
- imagePrompt: A detailed, optimized prompt for Nano Banana image generation (include composition, style, lighting, mood)
- cameraAngle: The camera angle or shot type (e.g., "wide establishing shot", "close-up", "medium shot", "dramatic low angle")
- lighting: The lighting style (e.g., "golden hour", "dramatic shadows", "soft natural light")
- mood: The emotional mood or atmosphere (e.g., "energetic", "mysterious", "inspiring")

Generate {numberOfScenes} compelling scenes now.
`);

    try {
      // Create model with structured output
      const structuredModel = this.model.withStructuredOutput(ScenePromptSchema);

      // Format the prompt
      const formattedPrompt = await promptTemplate.format({
        userPrompt: userPrompt,
        numberOfScenes: numberOfScenes,
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
 * Generate scene prompts using LangChain agent
 */
export async function generateScenePromptsWithAI(
  userPrompt: string,
  numberOfScenes: number = 5
): Promise<ScenePrompts> {
  if (!ScenePromptAgent.validateApiKey()) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const agent = new ScenePromptAgent();
  return await agent.generateScenePrompts(userPrompt, numberOfScenes);
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

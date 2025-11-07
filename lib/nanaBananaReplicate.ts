// ============================================
// 🍌 REPLICATE NANO BANANA IMPLEMENTATION
// Image Generation with LangChain AI Agent
// ============================================

import Replicate from 'replicate';
import { generateScenePromptsWithAI, refineScenePromptWithAI } from './scenePromptAgent';

export interface SceneImage {
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
// GENERATE SINGLE IMAGE WITH NANO BANANA
// Using Replicate's google/nano-banana
// ============================================

async function generateImageWithNanaBanana(
  prompt: string,
  sceneNumber: number,
  metadata?: {
    description?: string;
    cameraAngle?: string;
    lighting?: string;
    mood?: string;
  }
): Promise<SceneImage> {
  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
  });

  console.log(`🍌 Generating image ${sceneNumber} with Nano Banana...`);
  console.log(`📝 Prompt: ${prompt}`);

  try {
    const output = await replicate.run('google/nano-banana', {
      input: {
        prompt: prompt,
        aspect_ratio: '9:16', // Vertical for mobile
        output_format: 'png',
        output_quality: 90,
      },
    });

    // Nano Banana on Replicate returns URL directly
    const imageUrl = Array.isArray(output) ? output[0] : output;

    console.log(`✅ Image ${sceneNumber} generated: ${imageUrl}`);

    return {
      id: `scene-${sceneNumber}`,
      url: imageUrl as string,
      prompt: prompt,
      sceneNumber: sceneNumber,
      ...metadata,
    };
  } catch (error) {
    console.error(`❌ Error generating image ${sceneNumber}:`, error);
    throw error;
  }
}

// ============================================
// GENERATE ALL SCENE IMAGES WITH AI PROMPTS
// ============================================

export async function generateSceneImages(
  userPrompt: string,
  numberOfScenes: number = 5
): Promise<SceneImage[]> {
  console.log('🚀 Starting AI-powered scene generation...');
  console.log(`📝 User prompt: "${userPrompt}"`);
  console.log(`🎬 Number of scenes: ${numberOfScenes}`);

  // Step 1: Use LangChain agent to generate intelligent scene prompts
  console.log('🤖 Generating scene prompts with AI...');
  const aiScenes = await generateScenePromptsWithAI(userPrompt, numberOfScenes);

  console.log('✅ AI scene prompts generated:');
  aiScenes.scenes.forEach((scene) => {
    console.log(`  Scene ${scene.sceneNumber}: ${scene.description}`);
  });

  // Step 2: Generate images in parallel using AI-optimized prompts
  console.log('🍌 Generating images with Nano Banana...');
  const imagePromises = aiScenes.scenes.map((scene) =>
    generateImageWithNanaBanana(scene.imagePrompt, scene.sceneNumber, {
      description: scene.description,
      cameraAngle: scene.cameraAngle,
      lighting: scene.lighting,
      mood: scene.mood,
    })
  );

  const images = await Promise.all(imagePromises);

  console.log(`✅ All ${numberOfScenes} images generated successfully!`);

  return images;
}

// ============================================
// REGENERATE A SINGLE SCENE WITH AI REFINEMENT
// ============================================

export async function regenerateScene(
  originalPrompt: string,
  sceneNumber: number,
  userFeedback?: string
): Promise<SceneImage> {
  console.log(`🔄 Regenerating scene ${sceneNumber}...`);

  // Use AI to refine the prompt based on feedback
  const refinedPrompt = await refineScenePromptWithAI(
    originalPrompt,
    sceneNumber,
    userFeedback
  );

  console.log(`🤖 AI refined prompt: "${refinedPrompt}"`);

  // Generate new image with refined prompt
  return await generateImageWithNanaBanana(refinedPrompt, sceneNumber);
}

// ============================================
// FALLBACK: SIMPLE PROMPT GENERATION
// Used if OpenAI API is not available
// ============================================

function generateScenePromptsSimple(
  userPrompt: string,
  numberOfScenes: number = 5
): string[] {
  const sceneTypes = [
    'establishing shot, wide angle',
    'medium close-up, detail focus',
    'dynamic angle, action moment',
    'close-up, dramatic lighting',
    'final hero shot, epic reveal',
  ];

  return sceneTypes.slice(0, numberOfScenes).map(
    (sceneType, index) =>
      `${userPrompt}, scene ${index + 1} of ${numberOfScenes}, ${sceneType}, professional photography, cinematic, 9:16 vertical format, high quality`
  );
}

// ============================================
// GENERATE SCENES WITH FALLBACK
// Tries AI first, falls back to simple if needed
// ============================================

export async function generateSceneImagesWithFallback(
  userPrompt: string,
  numberOfScenes: number = 5
): Promise<SceneImage[]> {
  try {
    // Try AI-powered generation first
    return await generateSceneImages(userPrompt, numberOfScenes);
  } catch (error) {
    console.warn('⚠️ AI generation failed, using simple prompts:', error);

    // Fallback to simple prompt generation
    const simplePrompts = generateScenePromptsSimple(userPrompt, numberOfScenes);

    const imagePromises = simplePrompts.map((prompt, index) =>
      generateImageWithNanaBanana(prompt, index + 1)
    );

    return await Promise.all(imagePromises);
  }
}

export default {
  generateSceneImages,
  generateSceneImagesWithFallback,
  regenerateScene,
};

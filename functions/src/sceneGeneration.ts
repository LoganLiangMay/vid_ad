/**
 * Firebase Cloud Functions for AI-powered scene generation
 * Replaces Next.js API routes for static export compatibility
 */

import * as functions from 'firebase-functions/v1';
import Replicate from 'replicate';
import type { Request, Response } from 'express';
import { AISceneGenerator } from './aiSceneGenerator';

// Types
interface SceneImage {
  id: string;
  url: string;
  prompt: string;
  videoPrompt?: string;
  sceneNumber: number;
  description?: string;
  cameraAngle?: string;
  lighting?: string;
  mood?: string;
}

interface GenerateScenesRequest {
  prompt?: string;
  numberOfScenes?: number;
  formData?: any;
}

interface RegenerateSceneRequest {
  originalPrompt: string;
  sceneNumber: number;
  customPrompt?: string;
}

// ============================================
// GENERATE SCENES FUNCTION
// ============================================

export const generateScenes = functions
  .runWith({
    timeoutSeconds: 540,
    memory: '2GB',
  })
  .https.onRequest(async (req: Request, res: Response) => {
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
      const body: GenerateScenesRequest = req.body;
      const { prompt, numberOfScenes = 5, formData } = body;

      // Check for required API keys
      if (!process.env.REPLICATE_API_TOKEN) {
        res.status(500).json({ error: 'REPLICATE_API_TOKEN not configured' });
        return;
      }

      if (!process.env.OPENAI_API_KEY) {
        console.warn('⚠️ OPENAI_API_KEY not configured - using simple prompts');
      }

      let images: SceneImage[];
      let enhancedWithFormData = false;
      let aiPowered = false;

      // Initialize AI Scene Generator
      if (formData && typeof formData === 'object') {
        console.log('🎨 Generating with AI-powered form data');
        enhancedWithFormData = true;

        try {
          const generator = new AISceneGenerator();
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
        } catch (error) {
          console.error('❌ AI generation failed, falling back to simple mode:', error);
          // Fallback to simple prompts
          const userPrompt = `${formData.productName}: ${formData.productDescription}`;
          images = await generateSimpleScenes(userPrompt, numberOfScenes);
        }
      } else if (prompt && typeof prompt === 'string') {
        console.log('📝 Generating with AI-enhanced prompt');

        try {
          const generator = new AISceneGenerator();
          images = await generator.generateSceneImages(prompt, numberOfScenes);
          aiPowered = !!process.env.OPENAI_API_KEY;
        } catch (error) {
          console.error('❌ AI generation failed, falling back to simple mode:', error);
          images = await generateSimpleScenes(prompt, numberOfScenes);
        }
      } else {
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
    } catch (error) {
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

export const regenerateScene = functions
  .runWith({
    timeoutSeconds: 180,
    memory: '2GB',
  })
  .https.onRequest(async (req: Request, res: Response) => {
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
      const body: RegenerateSceneRequest = req.body;
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
    } catch (error) {
      console.error('Error in regenerate-scene:', error);

      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to regenerate image',
      });
    }
  });

// ============================================
// HELPER FUNCTIONS
// ============================================

async function generateSimpleScenes(
  userPrompt: string,
  numberOfScenes: number
): Promise<SceneImage[]> {
  console.log(`🍌 Generating ${numberOfScenes} simple scene images...`);

  const sceneTypes = [
    'establishing shot, wide angle',
    'medium close-up, detail focus',
    'dynamic angle, action moment',
    'close-up, dramatic lighting',
    'final hero shot, epic reveal',
  ];

  const prompts = sceneTypes.slice(0, numberOfScenes).map(
    (sceneType, index) =>
      `${userPrompt}, scene ${index + 1} of ${numberOfScenes}, ${sceneType}, professional photography, cinematic, 9:16 vertical format, high quality`
  );

  const imagePromises = prompts.map((prompt, index) =>
    generateSingleImage(prompt, index + 1)
  );

  return await Promise.all(imagePromises);
}

async function generateSingleImage(
  prompt: string,
  sceneNumber: number
): Promise<SceneImage> {
  const replicate = new Replicate({
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

    console.log(`🔍 Raw nano-banana output for scene ${sceneNumber}:`, JSON.stringify(output).substring(0, 200));

    // Handle various output formats from Replicate
    let imageUrl: string;
    if (typeof output === 'string') {
      imageUrl = output;
      console.log(`✅ Output is string: ${imageUrl.substring(0, 50)}...`);
    } else if (Array.isArray(output)) {
      imageUrl = String(output[0] || '');
      console.log(`✅ Output is array, using first element (type: ${typeof output[0]}): ${imageUrl.substring(0, 50)}...`);
    } else if (output && typeof output === 'object') {
      // Check if output has a url() method (Replicate FileOutput)
      if (typeof (output as any).url === 'function') {
        imageUrl = String((output as any).url());
        console.log(`✅ Output is FileOutput with url() method: ${imageUrl.substring(0, 50)}...`);
      } else if ('url' in output && typeof (output as any).url === 'string') {
        imageUrl = String((output as any).url);
        console.log(`✅ Output is object with url property: ${imageUrl.substring(0, 50)}...`);
      } else {
        console.error(`❌ Unexpected object format from nano-banana:`, output);
        imageUrl = String(output);
      }
    } else {
      console.error(`❌ Unexpected output format from nano-banana:`, output);
      imageUrl = String(output);
    }

    // Validate that imageUrl is actually a string and not empty
    if (typeof imageUrl !== 'string') {
      console.error(`❌ imageUrl is not a string! Type: ${typeof imageUrl}, Value:`, imageUrl);
      imageUrl = String(imageUrl);
    }

    if (!imageUrl || imageUrl.includes('function')) {
      console.error(`❌ Invalid image URL extracted:`, imageUrl);
      throw new Error(`Failed to extract valid image URL from Replicate response. Got: ${imageUrl}`);
    }

    console.log(`✅ Image ${sceneNumber} generated successfully with URL: ${imageUrl}`);

    const result = {
      id: `scene-${sceneNumber}`,
      url: imageUrl,
      prompt: prompt,
      sceneNumber: sceneNumber,
    };

    console.log(`📦 Returning image object for scene ${sceneNumber}:`, JSON.stringify(result));

    return result;
  } catch (error) {
    console.error(`❌ Error generating image ${sceneNumber}:`, error);
    throw error;
  }
}

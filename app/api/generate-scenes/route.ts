// ============================================
// API ROUTE: /api/generate-scenes
// Generate scene images with AI-powered prompts
// Accepts either simple prompt or full form data
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import {
  generateSceneImagesWithFallback,
  generateSceneImagesFromFormData,
} from '@/lib/nanaBananaReplicate';
import type { AdGenerationFormData } from '@/lib/schemas/adGenerationSchema';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, numberOfScenes, formData } = body;

    // Check for required API keys
    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: 'REPLICATE_API_TOKEN not configured' },
        { status: 500 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      console.warn('⚠️ OPENAI_API_KEY not configured - using simple prompts');
    }

    let images;
    let enhancedWithFormData = false;

    // Check if full form data was provided
    if (formData && typeof formData === 'object') {
      console.log('🎨 Generating with full form data enhancement');
      enhancedWithFormData = true;

      // Validate that we have minimum required fields
      if (!formData.productName || !formData.productDescription) {
        return NextResponse.json(
          { error: 'Form data must include productName and productDescription' },
          { status: 400 }
        );
      }

      // Generate images using full form context
      images = await generateSceneImagesFromFormData(
        formData as AdGenerationFormData,
        numberOfScenes || 5
      );
    } else if (prompt && typeof prompt === 'string') {
      console.log('📝 Generating with simple prompt');

      // Generate images with simple prompt (fallback mode)
      images = await generateSceneImagesWithFallback(prompt, numberOfScenes || 5);
    } else {
      return NextResponse.json(
        { error: 'Either prompt or formData is required' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      images: images,
      count: images.length,
      aiPowered: !!process.env.OPENAI_API_KEY,
      enhancedWithFormData: enhancedWithFormData,
    });
  } catch (error) {
    console.error('Error in generate-scenes:', error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to generate images',
      },
      { status: 500 }
    );
  }
}

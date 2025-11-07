// ============================================
// API ROUTE: /api/generate-scenes
// Generate scene images with AI-powered prompts
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { generateSceneImagesWithFallback } from '@/lib/nanaBananaReplicate';

export async function POST(request: NextRequest) {
  try {
    const { prompt, numberOfScenes } = await request.json();

    // Validation
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Valid prompt is required' },
        { status: 400 }
      );
    }

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

    // Generate images with AI-powered prompts (or fallback to simple)
    const images = await generateSceneImagesWithFallback(
      prompt,
      numberOfScenes || 5
    );

    return NextResponse.json({
      success: true,
      images: images,
      count: images.length,
      aiPowered: !!process.env.OPENAI_API_KEY,
    });
  } catch (error) {
    console.error('Error in generate-scenes:', error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to generate images',
      },
      { status: 500 }
    );
  }
}

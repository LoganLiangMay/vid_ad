// ============================================
// API ROUTE: /api/regenerate-scene
// Regenerate a single scene with AI refinement
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { regenerateScene } from '@/lib/nanaBananaReplicate';

export async function POST(request: NextRequest) {
  try {
    const { originalPrompt, sceneNumber, customPrompt } = await request.json();

    // Validation
    if (!originalPrompt || !sceneNumber) {
      return NextResponse.json(
        { error: 'originalPrompt and sceneNumber are required' },
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

    // Regenerate with AI refinement or custom prompt
    const image = await regenerateScene(
      originalPrompt,
      sceneNumber,
      customPrompt
    );

    return NextResponse.json({
      success: true,
      image: image,
      aiRefined: !!process.env.OPENAI_API_KEY && !customPrompt,
    });
  } catch (error) {
    console.error('Error in regenerate-scene:', error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to regenerate image',
      },
      { status: 500 }
    );
  }
}

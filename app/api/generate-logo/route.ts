import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface LogoGenerationRequest {
  productName: string;
  productDescription: string;
  brandTone: string;
  primaryColor: string;
}

interface LogoResult {
  url: string;
  prompt: string;
  variation: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: LogoGenerationRequest = await request.json();
    const { productName, productDescription, brandTone, primaryColor } = body;

    if (!productName || !brandTone || !primaryColor) {
      return NextResponse.json(
        { error: 'Missing required fields: productName, brandTone, primaryColor' },
        { status: 400 }
      );
    }

    // Check for Replicate API token
    if (!process.env.REPLICATE_API_TOKEN) {
      console.error('❌ REPLICATE_API_TOKEN is not set');
      return NextResponse.json(
        { error: 'API configuration error' },
        { status: 500 }
      );
    }

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    console.log('🍌 Starting logo generation with Nano Banana...');
    console.log(`📝 Product: ${productName}`);
    console.log(`🎨 Brand tone: ${brandTone}`);
    console.log(`🎨 Primary color: ${primaryColor}`);

    // Generate 3 different logo variations
    const variations = [
      {
        style: 'minimalist, icon-based',
        description: 'clean, simple, iconic symbol',
      },
      {
        style: 'modern, geometric',
        description: 'contemporary shapes, bold design',
      },
      {
        style: 'elegant, sophisticated',
        description: 'refined, premium look',
      },
    ];

    const logoPromises = variations.map(async (variation, index) => {
      const prompt = `Professional logo design for "${productName}". ${productDescription}. Style: ${variation.style}, ${variation.description}. Brand tone: ${brandTone}. Primary color scheme: ${primaryColor}. High quality, vector-style, transparent background, centered composition, simple and memorable, suitable for business branding, clean design, 1:1 aspect ratio`;

      console.log(`🍌 Generating logo variation ${index + 1}...`);
      console.log(`📝 Prompt: ${prompt}`);

      try {
        const output = await replicate.run('google/nano-banana', {
          input: {
            prompt: prompt,
            aspect_ratio: '1:1', // Square for logo
            output_format: 'png',
            output_quality: 95,
          },
        });

        // Nano Banana returns URL directly or as array
        const imageUrl = Array.isArray(output) ? output[0] : output;

        console.log(`✅ Logo variation ${index + 1} generated successfully`);

        return {
          url: imageUrl as string,
          prompt: prompt,
          variation: index + 1,
        };
      } catch (error) {
        console.error(`❌ Error generating logo variation ${index + 1}:`, error);
        throw error;
      }
    });

    // Generate all 3 logos in parallel
    const logos: LogoResult[] = await Promise.all(logoPromises);

    console.log(`✅ All 3 logo variations generated successfully!`);

    return NextResponse.json({
      success: true,
      logos,
      basePrompt: `Professional logo design for "${productName}". ${productDescription}. Brand tone: ${brandTone}. Primary color: ${primaryColor}.`,
    });
  } catch (error: any) {
    console.error('❌ Error in logo generation API:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate logos',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Firebase Cloud Function for AI-powered concept generation
 * Generates 3 creative concepts ("Director's Treatment") for video ads
 */

import * as functions from 'firebase-functions/v1';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import type { Request, Response } from 'express';

// ============================================
// TYPES & SCHEMAS
// ============================================

interface GenerateConceptsRequest {
  productName: string;
  productDescription: string;
  keywords?: string[];
  brandTone?: string;
  targetAudience?: string;
  duration?: number;
  creativeDirection?: string;
}

const ConceptSchema = z.object({
  id: z.string(),
  tagline: z.string(),
  narrativeArc: z.string(),
  visualStyle: z.string(),
  targetEmotion: z.string(),
  sceneBreakdown: z.array(z.string()),
});

const ConceptsResponseSchema = z.object({
  concepts: z.array(ConceptSchema),
});

// ============================================
// GENERATE CONCEPTS FUNCTION
// ============================================

export const generateConcepts = functions
  .runWith({
    timeoutSeconds: 300,
    memory: '1GB',
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
      const body: GenerateConceptsRequest = req.body;
      const {
        productName,
        productDescription,
        keywords = [],
        brandTone = 'professional',
        targetAudience,
        duration = 7,
        creativeDirection,
      } = body;

      // Check for OpenAI API key
      if (!process.env.OPENAI_API_KEY) {
        console.warn('⚠️ OPENAI_API_KEY not configured - using fallback concepts');
        const fallbackConcepts = generateFallbackConcepts(
          productName,
          productDescription,
          brandTone
        );
        res.status(200).json({
          success: true,
          concepts: fallbackConcepts,
          aiPowered: false,
        });
        return;
      }

      console.log(`🎨 Generating 3 concepts for: ${productName}`);

      const model = new ChatOpenAI({
        modelName: 'gpt-4o-mini',
        temperature: 0.9, // Higher creativity for concepts
        openAIApiKey: process.env.OPENAI_API_KEY,
      });

      const promptTemplate = PromptTemplate.fromTemplate(`
You are a creative director for a video advertising agency. Generate 3 diverse creative concepts for a video advertisement.

PRODUCT INFORMATION:
Product: {productName}
Description: {productDescription}
Brand Tone: {brandTone}
Target Audience: {targetAudience}
Keywords: {keywords}
Video Duration: {duration} seconds
${creativeDirection ? `\nUSER'S CREATIVE DIRECTION:\n"${creativeDirection}"\n` : ''}

REQUIREMENTS:
1. Generate 3 DISTINCT creative concepts (Director's Treatment)
2. Each concept should have a unique approach and emotional angle
3. Concepts should vary in style (e.g., one energetic, one elegant, one playful)
${creativeDirection ? '4. IMPORTANT: Incorporate the user\'s creative direction into all concepts. Use their vision as the foundation while adding professional polish and variety.\n5. ' : '4. '}Each concept includes:
   - Compelling tagline (4-8 words)
   - Narrative arc (how the story unfolds)
   - Visual style (colors, mood, aesthetics)
   - Target emotion (what viewers should feel)
   - Scene breakdown (5-7 specific scene descriptions for {duration}s video)

OUTPUT FORMAT (JSON):
{{
  "concepts": [
    {{
      "id": "concept-1",
      "tagline": "Short compelling tagline",
      "narrativeArc": "Description of how the story flows from start to finish",
      "visualStyle": "Visual aesthetics, color palette, mood description",
      "targetEmotion": "Primary emotion (e.g., excitement, trust, curiosity)",
      "sceneBreakdown": [
        "Scene 1: Detailed description",
        "Scene 2: Detailed description",
        ...
      ]
    }},
    {{ "id": "concept-2", ... }},
    {{ "id": "concept-3", ... }}
  ]
}}

Generate 3 unique concepts now:
`);

      const formattedPrompt = await promptTemplate.format({
        productName,
        productDescription,
        brandTone,
        targetAudience: targetAudience || 'General consumers',
        keywords: keywords.join(', ') || 'N/A',
        duration: duration.toString(),
        creativeDirection: creativeDirection || '',
      });

      try {
        const response = await model.invoke(formattedPrompt);
        const content =
          typeof response.content === 'string'
            ? response.content
            : JSON.stringify(response.content);

        // Parse JSON response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in AI response');
        }

        const parsed = JSON.parse(jsonMatch[0]);
        const validated = ConceptsResponseSchema.parse(parsed);

        console.log(`✅ Generated ${validated.concepts.length} AI concepts`);

        res.status(200).json({
          success: true,
          concepts: validated.concepts,
          aiPowered: true,
        });
      } catch (aiError) {
        console.error('❌ AI generation failed:', aiError);
        // Fallback to simple concepts
        const fallbackConcepts = generateFallbackConcepts(
          productName,
          productDescription,
          brandTone
        );
        res.status(200).json({
          success: true,
          concepts: fallbackConcepts,
          aiPowered: false,
        });
      }
    } catch (error) {
      console.error('Error in generate-concepts:', error);

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate concepts',
      });
    }
  });

// ============================================
// FALLBACK CONCEPTS
// ============================================

function generateFallbackConcepts(
  productName: string,
  _productDescription: string,
  brandTone: string
) {
  console.log('🍌 Generating fallback concepts (no AI)');

  const toneStyles: Record<string, any> = {
    professional: {
      tagline: 'Excellence Meets Innovation',
      visual: 'Clean lines, corporate blue and white, professional settings',
      emotion: 'Trust',
    },
    casual: {
      tagline: 'Everyday Comfort, Everyday Joy',
      visual: 'Warm colors, natural settings, relaxed atmosphere',
      emotion: 'Comfort',
    },
    playful: {
      tagline: 'Fun Starts Here',
      visual: 'Bright colors, dynamic animations, energetic vibes',
      emotion: 'Excitement',
    },
    luxury: {
      tagline: 'Redefine Elegance',
      visual: 'Rich tones, premium materials, sophisticated lighting',
      emotion: 'Aspiration',
    },
    energetic: {
      tagline: 'Unleash Your Energy',
      visual: 'Bold colors, fast-paced cuts, dynamic camera work',
      emotion: 'Motivation',
    },
  };

  const style = toneStyles[brandTone.toLowerCase()] || toneStyles.professional;

  return [
    {
      id: 'concept-1',
      tagline: `${productName}: ${style.tagline}`,
      narrativeArc: `Opens with problem statement, introduces ${productName} as solution, demonstrates benefits, ends with clear call-to-action`,
      visualStyle: style.visual,
      targetEmotion: style.emotion,
      sceneBreakdown: [
        `Establishing shot: Set the context for ${productName}`,
        `Problem introduction: Show the need for the product`,
        `Product reveal: Dramatic introduction of ${productName}`,
        `Key features: Highlight main benefits`,
        `Lifestyle integration: Show product in use`,
        `Call-to-action: Clear next step for viewers`,
      ],
    },
    {
      id: 'concept-2',
      tagline: `Transform Your Experience with ${productName}`,
      narrativeArc: `Before-and-after storytelling showing transformation enabled by ${productName}`,
      visualStyle: `Contrast visuals, split-screen effects, transformation focus`,
      targetEmotion: 'Hope',
      sceneBreakdown: [
        `Before scenario: Life without ${productName}`,
        `Discovery moment: Finding the solution`,
        `Transformation begins: First use of ${productName}`,
        `Benefits unfold: Multiple use cases`,
        `After scenario: Improved life with product`,
        `Invitation: Join the transformation`,
      ],
    },
    {
      id: 'concept-3',
      tagline: `${productName} - Your Story Starts Now`,
      narrativeArc: `Customer-centric narrative following a day in the life enhanced by ${productName}`,
      visualStyle: `Documentary-style, authentic moments, relatable settings`,
      targetEmotion: 'Connection',
      sceneBreakdown: [
        `Morning routine: Natural product integration`,
        `Daily challenges: How product helps`,
        `Mid-day moment: Product in action`,
        `Evening reflection: Benefits realized`,
        `Community aspect: Shared experience`,
        `Final message: Be part of something bigger`,
      ],
    },
  ];
}

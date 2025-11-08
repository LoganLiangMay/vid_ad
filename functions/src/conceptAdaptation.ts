/**
 * Firebase Cloud Function for AI-powered scene breakdown adaptation
 * Intelligently adapts scene breakdowns to match target scene count
 */

import * as functions from 'firebase-functions/v1';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import type { Request, Response } from 'express';

// ============================================
// TYPES & SCHEMAS
// ============================================

interface ConceptData {
  tagline: string;
  narrativeArc: string;
  visualStyle: string;
  targetEmotion: string;
  currentScenes: string[];
}

interface AdaptSceneBreakdownRequest {
  concept: ConceptData;
  targetSceneCount: number;
  productName: string;
  duration: number;
}

const AdaptedScenesSchema = z.object({
  adaptedScenes: z.array(z.string()),
});

// ============================================
// ADAPT SCENE BREAKDOWN FUNCTION
// ============================================

export const adaptSceneBreakdown = functions
  .runWith({
    timeoutSeconds: 120,
    memory: '512MB',
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
      res.status(405).json({ success: false, error: 'Method not allowed' });
      return;
    }

    try {
      const body: AdaptSceneBreakdownRequest = req.body;
      const { concept, targetSceneCount, productName, duration } = body;

      // Validation
      if (!concept || !concept.currentScenes || !targetSceneCount) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: concept, targetSceneCount',
        });
        return;
      }

      const currentSceneCount = concept.currentScenes.length;

      // If scene count matches, return original scenes
      if (currentSceneCount === targetSceneCount) {
        console.log(
          `✅ Scene count already matches (${targetSceneCount}), no adaptation needed`
        );
        res.status(200).json({
          success: true,
          adaptedScenes: concept.currentScenes,
          adapted: false,
        });
        return;
      }

      // Check for OpenAI API key
      if (!process.env.OPENAI_API_KEY) {
        console.warn('⚠️ OPENAI_API_KEY not configured - using simple adaptation');
        const simpleAdaptation = simpleAdaptScenes(
          concept.currentScenes,
          targetSceneCount
        );
        res.status(200).json({
          success: true,
          adaptedScenes: simpleAdaptation,
          adapted: true,
          aiPowered: false,
        });
        return;
      }

      console.log(
        `🎬 Adapting scene breakdown from ${currentSceneCount} to ${targetSceneCount} scenes`
      );

      const model = new ChatOpenAI({
        modelName: 'gpt-4o-mini',
        temperature: 0.7,
        openAIApiKey: process.env.OPENAI_API_KEY,
      });

      const adaptationType = targetSceneCount > currentSceneCount ? 'expand' : 'condense';

      const promptTemplate = PromptTemplate.fromTemplate(`
You are a video production expert specializing in scene breakdowns. Your task is to ${adaptationType} a scene breakdown to match the target scene count while maintaining narrative coherence and visual quality.

CURRENT CONCEPT:
Product: {productName}
Video Duration: {duration} seconds
Tagline: {tagline}
Narrative Arc: {narrativeArc}
Visual Style: {visualStyle}
Target Emotion: {targetEmotion}

CURRENT SCENE BREAKDOWN ({currentSceneCount} scenes):
{currentScenes}

TASK:
${adaptationType === 'expand'
  ? `EXPAND from ${currentSceneCount} to ${targetSceneCount} scenes by:
- Breaking down existing scenes into more detailed sub-scenes
- Adding transitional scenes between major moments
- Expanding key moments with additional angles or perspectives
- Maintaining the core narrative arc and visual style`
  : `CONDENSE from ${currentSceneCount} to ${targetSceneCount} scenes by:
- Combining related scenes into single, more impactful moments
- Removing transitional or redundant scenes
- Focusing on the most essential narrative beats
- Maintaining the core story and emotional impact`}

REQUIREMENTS:
1. Generate EXACTLY {targetSceneCount} scenes
2. Maintain the original concept's tagline, narrative arc, visual style, and target emotion
3. Each scene should be detailed and specific (similar length to original scenes)
4. Preserve the beginning, middle, and end structure
5. Keep the {duration}-second video duration in mind for pacing
6. Each scene description should be action-oriented and visual

OUTPUT FORMAT (JSON):
{{
  "adaptedScenes": [
    "Scene 1: Detailed description...",
    "Scene 2: Detailed description...",
    ...
    "Scene {targetSceneCount}: Detailed description..."
  ]
}}

Generate the adapted scene breakdown now:
`);

      const formattedPrompt = await promptTemplate.format({
        productName,
        duration: duration.toString(),
        tagline: concept.tagline,
        narrativeArc: concept.narrativeArc,
        visualStyle: concept.visualStyle,
        targetEmotion: concept.targetEmotion,
        currentSceneCount: currentSceneCount.toString(),
        targetSceneCount: targetSceneCount.toString(),
        currentScenes: concept.currentScenes
          .map((scene, i) => `${i + 1}. ${scene}`)
          .join('\n'),
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
        const validated = AdaptedScenesSchema.parse(parsed);

        // Verify scene count matches
        if (validated.adaptedScenes.length !== targetSceneCount) {
          console.warn(
            `⚠️ AI returned ${validated.adaptedScenes.length} scenes, expected ${targetSceneCount}`
          );
          // Use simple adaptation as fallback
          const simpleAdaptation = simpleAdaptScenes(
            concept.currentScenes,
            targetSceneCount
          );
          res.status(200).json({
            success: true,
            adaptedScenes: simpleAdaptation,
            adapted: true,
            aiPowered: false,
          });
          return;
        }

        console.log(
          `✅ Successfully adapted scene breakdown to ${validated.adaptedScenes.length} scenes`
        );

        res.status(200).json({
          success: true,
          adaptedScenes: validated.adaptedScenes,
          adapted: true,
          aiPowered: true,
        });
      } catch (aiError) {
        console.error('❌ AI adaptation failed:', aiError);
        // Fallback to simple adaptation
        const simpleAdaptation = simpleAdaptScenes(
          concept.currentScenes,
          targetSceneCount
        );
        res.status(200).json({
          success: true,
          adaptedScenes: simpleAdaptation,
          adapted: true,
          aiPowered: false,
        });
      }
    } catch (error) {
      console.error('Error in adaptSceneBreakdown:', error);

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to adapt scenes',
      });
    }
  });

// ============================================
// SIMPLE SCENE ADAPTATION (FALLBACK)
// ============================================

function simpleAdaptScenes(
  currentScenes: string[],
  targetSceneCount: number
): string[] {
  const currentCount = currentScenes.length;

  if (currentCount === targetSceneCount) {
    return currentScenes;
  }

  if (targetSceneCount > currentCount) {
    // EXPAND: Add intermediate scenes
    const adaptedScenes: string[] = [];

    currentScenes.forEach((scene, index) => {
      adaptedScenes.push(scene);

      // Add intermediate scene if needed (except after last scene)
      if (
        index < currentScenes.length - 1 &&
        adaptedScenes.length < targetSceneCount
      ) {
        const nextScene = currentScenes[index + 1];
        adaptedScenes.push(
          `Transition: Bridge between ${scene.split(':')[0]} and ${nextScene.split(':')[0]}`
        );
      }
    });

    // Trim to exact count if we over-added
    return adaptedScenes.slice(0, targetSceneCount);
  } else {
    // CONDENSE: Select most important scenes evenly
    const step = currentCount / targetSceneCount;
    const adaptedScenes: string[] = [];

    for (let i = 0; i < targetSceneCount; i++) {
      const index = Math.floor(i * step);
      adaptedScenes.push(currentScenes[index]);
    }

    return adaptedScenes;
  }
}

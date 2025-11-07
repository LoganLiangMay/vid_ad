# AI-Powered Scene Generation

## Overview

This project integrates **LangChain** with **OpenAI** to intelligently interpret user inputs and generate optimized prompts for **Google Nano Banana** image generation via **Replicate**.

## Architecture

```
User Input
    ↓
LangChain Agent (OpenAI GPT-4o-mini)
    ↓
5 Scene Prompts (with metadata)
    ↓
Replicate Nano Banana (parallel generation)
    ↓
5 Scene Images (9:16 format)
```

## Components

### 1. LangChain Scene Prompt Agent
**File:** `lib/scenePromptAgent.ts`

- Uses OpenAI GPT-4o-mini for cost-effective, fast generation
- Structured output parsing with Zod schemas
- Generates 5 scenes with:
  - Scene description
  - Optimized image prompt
  - Camera angle
  - Lighting style
  - Mood/atmosphere

**Key Features:**
- Intelligent scene progression (Hook → Intro → Build → Climax → Resolution)
- 9:16 vertical format optimization
- Cinematic storytelling guidance
- Prompt refinement for regeneration

### 2. Nano Banana Integration
**File:** `lib/nanaBananaReplicate.ts`

- Connects to Replicate's Google Nano Banana model
- Parallel image generation (all 5 scenes at once)
- Metadata preservation (camera, lighting, mood)
- AI refinement for scene regeneration
- Fallback to simple prompts if OpenAI unavailable

### 3. API Routes

#### `/api/generate-scenes`
**POST** - Generate all 5 scene images

**Request:**
```json
{
  "prompt": "Fashion model showcasing streetwear...",
  "numberOfScenes": 5
}
```

**Response:**
```json
{
  "success": true,
  "images": [
    {
      "id": "scene-1",
      "url": "https://replicate.delivery/...",
      "prompt": "Detailed optimized prompt...",
      "sceneNumber": 1,
      "description": "Establishing shot...",
      "cameraAngle": "wide angle",
      "lighting": "golden hour",
      "mood": "energetic"
    }
    // ... 4 more scenes
  ],
  "count": 5,
  "aiPowered": true
}
```

#### `/api/regenerate-scene`
**POST** - Regenerate a single scene with AI refinement

**Request:**
```json
{
  "originalPrompt": "Original image prompt...",
  "sceneNumber": 2,
  "customPrompt": "Optional user feedback or custom prompt"
}
```

**Response:**
```json
{
  "success": true,
  "image": {
    "id": "scene-2",
    "url": "https://replicate.delivery/...",
    "prompt": "AI-refined prompt...",
    "sceneNumber": 2
  },
  "aiRefined": true
}
```

## Setup

### 1. Install Dependencies

```bash
npm install langchain @langchain/openai replicate zod
```

### 2. Configure Environment Variables

Create `.env` file:

```bash
# Required
OPENAI_API_KEY=sk-...
REPLICATE_API_TOKEN=r8_...

# Optional (for Firebase deployment)
NEXT_PUBLIC_FIREBASE_API_KEY=...
```

Get API keys:
- OpenAI: https://platform.openai.com/api-keys
- Replicate: https://replicate.com/account/api-tokens

### 3. Test the Integration

```bash
# Test AI prompt generation only
npm run test:ai-scenes

# Test full image generation
npm run test:replicate
```

## Usage Examples

### Basic Scene Generation

```typescript
import { generateSceneImages } from '@/lib/nanaBananaReplicate';

const images = await generateSceneImages(
  'Fashion model in urban streetwear',
  5
);

console.log(images);
// [
//   { id: 'scene-1', url: '...', prompt: '...', ... },
//   ...
// ]
```

### With Fallback (Recommended)

```typescript
import { generateSceneImagesWithFallback } from '@/lib/nanaBananaReplicate';

// Will use AI if available, simple prompts otherwise
const images = await generateSceneImagesWithFallback(
  'Product showcase in modern setting',
  5
);
```

### Regenerate Scene with Feedback

```typescript
import { regenerateScene } from '@/lib/nanaBananaReplicate';

const newImage = await regenerateScene(
  'Original prompt here',
  2, // Scene number
  'Make it more dramatic with darker lighting' // User feedback
);
```

### Direct AI Prompt Generation

```typescript
import { generateScenePromptsWithAI } from '@/lib/scenePromptAgent';

const scenes = await generateScenePromptsWithAI(
  'Tech product launch video',
  5
);

scenes.scenes.forEach((scene) => {
  console.log(`Scene ${scene.sceneNumber}:`);
  console.log(`  Description: ${scene.description}`);
  console.log(`  Prompt: ${scene.imagePrompt}`);
  console.log(`  Camera: ${scene.cameraAngle}`);
  console.log(`  Lighting: ${scene.lighting}`);
  console.log(`  Mood: ${scene.mood}`);
});
```

## Cost Analysis

### OpenAI (GPT-4o-mini)
- Input: ~500 tokens per request
- Output: ~1000 tokens per request
- Cost per generation: ~$0.0003

### Replicate (Nano Banana)
- Currently: **$0.00** (free tier)
- Fast generation (~6 seconds per image)
- 5 images in parallel: ~6 seconds total

**Total cost per 5-scene video: ~$0.0003**

## Error Handling

The system includes multiple layers of fallback:

1. **OpenAI unavailable** → Falls back to simple prompt templates
2. **Replicate rate limit** → Returns error with retry suggestion
3. **Individual scene failure** → Continues with other scenes, reports error

## Performance

- **AI Prompt Generation:** 2-4 seconds
- **Image Generation (5 scenes parallel):** 6-10 seconds
- **Total Time:** ~8-14 seconds for complete workflow

## Extending the System

### Add Custom Scene Types

Edit `lib/scenePromptAgent.ts`:

```typescript
const promptTemplate = PromptTemplate.fromTemplate(`
  ...
  CUSTOM GUIDELINES:
  - Your custom requirements here
  - Specific style instructions
  - Brand guidelines
  ...
`);
```

### Change AI Model

Edit `lib/scenePromptAgent.ts`:

```typescript
this.model = new ChatOpenAI({
  modelName: 'gpt-4', // More capable, slower, more expensive
  temperature: 0.7,
});
```

### Modify Scene Structure

Edit the Zod schema in `lib/scenePromptAgent.ts`:

```typescript
const ScenePromptSchema = z.object({
  scenes: z.array(
    z.object({
      // Add your custom fields here
      customField: z.string(),
      // ...
    })
  ),
});
```

## Troubleshooting

### "OPENAI_API_KEY not configured"
- Verify `.env` file exists
- Check API key format: `sk-...`
- Restart dev server after adding key

### "REPLICATE_API_TOKEN not configured"
- Get token from https://replicate.com/account/api-tokens
- Add to `.env`: `REPLICATE_API_TOKEN=r8_...`

### Slow generation
- Check internet connection
- Verify Replicate service status
- Consider reducing `numberOfScenes`

### AI generates poor prompts
- Adjust `temperature` (lower = more consistent)
- Enhance prompt template with examples
- Add specific style guidelines

## Next Steps

1. **Frontend Integration:** Connect to `/generate` page UI
2. **Video Generation:** Convert scenes to video with transitions
3. **Prompt Templates:** Add preset styles (cinematic, product, lifestyle)
4. **User Feedback Loop:** Save successful prompts for training
5. **Advanced Features:**
   - Style consistency across scenes
   - Brand guideline enforcement
   - Multi-language support
   - Batch processing

## Resources

- [LangChain Documentation](https://js.langchain.com/docs/)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Replicate Nano Banana](https://replicate.com/google/nano-banana)
- [Structured Output Parsing](https://js.langchain.com/docs/modules/model_io/output_parsers/)

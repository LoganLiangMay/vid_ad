# Kling Video Transitions Implementation

## Overview
This document describes the implementation of scene-to-scene video transitions using Kling 2.5 Turbo Pro. Instead of generating standalone videos, this creates smooth transitions between storyboard images, creating a cohesive narrative flow.

## Concept

### Traditional Approach (OLD)
- Generate 2-3 standalone videos from text prompts
- Each video is independent
- No connection between scenes

### Transition Approach (NEW - Kling)
- For N storyboard images, generate N-1 transition videos
- Each video transitions from one image to the next
- Creates a flowing, cinematic narrative

```
Image 1 → [Video 1] → Image 2 → [Video 2] → Image 3 → [Video 3] → Image 4
  │                      │                      │                      │
  Scene 1               Scene 2               Scene 3               Scene 4
```

## Implementation

### 1. Firebase Functions (`functions/src/klingVideo.ts`)

#### `generateKlingTransitions`
Generates N-1 transition videos for N scene images.

**Input:**
```typescript
{
  campaignId: string,
  scenes: [
    {
      id: string,
      url: string,           // S3 URL of scene image
      prompt: string,         // Original scene prompt
      sceneNumber: number,
      description: string,
      mood: string
    },
    // ... more scenes
  ],
  duration: 5 | 10,          // Video duration in seconds
  aspectRatio: '9:16' | '16:9' | '1:1'
}
```

**Process:**
1. Loops through scenes creating transitions:
   - Transition 1: Scene 1 → Scene 2
   - Transition 2: Scene 2 → Scene 3
   - Transition 3: Scene 3 → Scene 4
   - etc.

2. For each transition:
   - Uses `currentScene.url` as `start_image`
   - Generates transition prompt describing movement
   - Starts Replicate prediction
   - Stores video info in Firestore

3. Updates campaign status to `generating`

**Output:**
```typescript
{
  success: true,
  campaignId: string,
  totalScenes: number,
  totalVideos: number,        // N-1 for N scenes
  videos: [
    {
      videoId: string,
      predictionId: string,
      transitionIndex: number,
      fromSceneNumber: number,
      toSceneNumber: number,
      status: string
    },
    // ... more videos
  ]
}
```

#### `checkKlingTransitionsStatus`
Polls Replicate API for video generation progress.

**Input:**
```typescript
{
  campaignId: string,
  videoIds: string[]         // Array of video IDs to check
}
```

**Process:**
1. Checks each video's prediction status
2. Updates Firestore with latest status and output URLs
3. When all complete, updates campaign status to `completed`

**Output:**
```typescript
{
  success: true,
  campaignId: string,
  videos: [
    {
      videoId: string,
      transitionIndex: number,
      fromSceneNumber: number,
      toSceneNumber: number,
      status: 'succeeded' | 'failed' | 'processing',
      output: string | null,   // Video URL when complete
      error: string | null
    },
    // ... more videos
  ],
  allComplete: boolean,
  anyFailed: boolean,
  completedCount: number,
  totalCount: number
}
```

### 2. Transition Prompt Generation

The `createTransitionPrompt` function generates dynamic prompts that describe the movement from one scene to the next:

**Algorithm:**
```typescript
function createTransitionPrompt(currentScene, nextScene) {
  // Extract moods/descriptions
  const currentMood = currentScene.mood || currentScene.description
  const nextMood = nextScene.mood || nextScene.description

  // Describe the transition
  const transitions = []
  transitions.push(`Smooth cinematic transition from ${currentMood} to ${nextMood}`)

  // Add random camera movement
  const cameraMovements = [
    'camera slowly pans forward',
    'camera gently zooms in',
    'smooth camera movement',
    'cinematic camera motion',
    'gradual camera push'
  ]
  transitions.push(randomChoice(cameraMovements))

  // Add quality descriptors
  transitions.push('high quality, cinematic lighting, smooth motion')

  return transitions.join(', ')
}
```

**Example Transitions:**
```
Scene 1 (peaceful sunrise) → Scene 2 (bustling city)
Prompt: "Smooth cinematic transition from peaceful sunrise to bustling city, camera slowly pans forward, high quality, cinematic lighting, smooth motion"

Scene 2 (bustling city) → Scene 3 (product closeup)
Prompt: "Smooth cinematic transition from bustling city to product closeup, camera gently zooms in, high quality, cinematic lighting, smooth motion"
```

### 3. Kling 2.5 Turbo Pro API

**Model:** `kwaivgi/kling-v2.5-turbo-pro`
**Version:** `939cd1851c5b112f284681b57ee9b0f36d0f913ba97de5845a7eef92d52837df`

**Key Features:**
- **start_image**: Uses scene image as first frame (CRITICAL for transitions)
- **duration**: 5 or 10 seconds
- **aspect_ratio**: Auto-detected from start_image (when provided)
- **Cost**: $0.07 per second ($0.35 for 5s, $0.70 for 10s)

**API Call Example:**
```javascript
await replicate.predictions.create({
  version: '939cd1851c5b112f284681b57ee9b0f36d0f913ba97de5845a7eef92d52837df',
  input: {
    prompt: 'Smooth cinematic transition from scene 1 to scene 2, camera pans forward',
    start_image: 'https://s3.amazonaws.com/vid-ad/scenes/user123/campaign456/scene-1.jpg',
    duration: 5,
    aspect_ratio: '9:16'
  }
});
```

### 4. Data Storage

#### Firestore Structure
```
videoGenerations/{videoId}
  ├─ userId: string
  ├─ campaignId: string
  ├─ predictionId: string
  ├─ model: "kwaivgi/kling-v2.5-turbo-pro"
  ├─ status: "starting" | "processing" | "succeeded" | "failed"
  ├─ type: "scene-transition"
  ├─ transitionIndex: number (0-indexed)
  ├─ fromScene:
  │  ├─ id: string
  │  ├─ sceneNumber: number
  │  └─ imageUrl: string (S3 URL)
  ├─ toScene:
  │  ├─ id: string
  │  ├─ sceneNumber: number
  │  └─ imageUrl: string (S3 URL)
  ├─ input: object (API parameters)
  ├─ output: string | null (video URL when complete)
  ├─ createdAt: timestamp
  └─ updatedAt: timestamp

campaigns/{campaignId}
  ├─ status: "draft" | "generating" | "completed" | "failed"
  ├─ storyboardImages: array (scene data with S3 URLs)
  ├─ videos: [
  │    {
  │      videoId: string,
  │      predictionId: string,
  │      transitionIndex: number,
  │      fromSceneNumber: number,
  │      toSceneNumber: number,
  │      status: string,
  │      output?: string
  │    },
  │    // ... more videos
  │  ]
  ├─ videoGenerationStartedAt: timestamp
  ├─ videoGenerationCompletedAt: timestamp
  └─ updatedAt: timestamp
```

## Cost Calculation

### Example: 5-Scene Storyboard

**Scenes:**
- Scene 1: Product introduction
- Scene 2: Feature highlight
- Scene 3: Lifestyle shot
- Scene 4: Call to action
- Scene 5: Brand logo

**Transitions Generated:** 4 videos (N-1)
1. Scene 1 → Scene 2 (5 seconds)
2. Scene 2 → Scene 3 (5 seconds)
3. Scene 3 → Scene 4 (5 seconds)
4. Scene 4 → Scene 5 (5 seconds)

**Total Duration:** 20 seconds
**Cost:** 20 × $0.07 = **$1.40**

**Previous Approach (for comparison):**
- 2-3 standalone videos
- ~15-21 seconds total
- Cost: $1.05 - $1.47

**Cost is similar, but quality/coherence is much better with transitions!**

## Usage Flow

### 1. Form Completion
```
User completes form → Generates concepts → Selects concept →
Generates storyboard (5-10 images) → Reviews images →
Submits for video generation
```

### 2. Video Generation Trigger
```javascript
// In /generate/results page
const { httpsCallable } = await import('firebase/functions');
const { functions } = await import('@/lib/firebase/config');
const generateTransitions = httpsCallable(functions, 'generateKlingTransitions');

const result = await generateTransitions({
  campaignId: 'campaign-uuid',
  scenes: [
    { id: '1', url: 's3://...scene-1.jpg', sceneNumber: 1, mood: 'peaceful', ... },
    { id: '2', url: 's3://...scene-2.jpg', sceneNumber: 2, mood: 'energetic', ... },
    // ... more scenes
  ],
  duration: 5,
  aspectRatio: '9:16'
});

// result.data.videos contains all video IDs
```

### 3. Progress Polling
```javascript
// Poll every 3-5 seconds
const checkStatus = httpsCallable(functions, 'checkKlingTransitionsStatus');

setInterval(async () => {
  const result = await checkStatus({
    campaignId: 'campaign-uuid',
    videoIds: ['video-1', 'video-2', 'video-3', 'video-4']
  });

  if (result.data.allComplete) {
    // All videos ready!
    // result.data.videos contains output URLs
    stopPolling();
    displayVideos(result.data.videos);
  }
}, 5000);
```

### 4. Display Results
```javascript
// Show transition videos in order
result.data.videos
  .sort((a, b) => a.transitionIndex - b.transitionIndex)
  .forEach(video => {
    if (video.status === 'succeeded' && video.output) {
      displayVideo({
        url: video.output,
        label: `Transition ${video.fromSceneNumber} → ${video.toSceneNumber}`
      });
    }
  });
```

## Benefits

### 1. Cinematic Flow
- Videos transition smoothly from one scene to the next
- Creates a cohesive narrative
- Professional, polished feel

### 2. Better Context
- Each video starts exactly where the previous scene left off
- Maintains visual consistency (colors, lighting, mood)
- Tells a complete story, not disjointed clips

### 3. Flexibility
- Can adjust duration (5s or 10s per transition)
- Works with any number of scenes (3-10)
- Automatic prompt generation based on scene moods

### 4. Cost-Effective
- Similar cost to previous approach
- Better quality per dollar
- Scalable (cost scales linearly with number of scenes)

## Limitations & Considerations

### 1. Kling API Limitations
- **No end_image parameter**: Can't specify exact ending frame
  - **Workaround**: Use descriptive prompts to guide transition
- **Aspect ratio locked to start_image**: Can't override when using start_image
  - **Solution**: Ensure all storyboard images have consistent aspect ratio

### 2. Generation Time
- Each video takes 30-90 seconds to generate
- For 5 scenes (4 transitions): 2-6 minutes total
- **Must show progress** to keep users engaged

### 3. Sequential Dependencies
- Videos should ideally be shown in order
- If one transition fails, may affect narrative flow
- **Solution**: Allow regeneration of individual transitions

### 4. Cost Scaling
- Cost scales with number of scenes: N scenes = N-1 videos
- 10 scenes (max) = 9 transitions × 5s × $0.07 = $3.15
- Consider adding cost warning for large storyboards

## Next Steps (TODO for Results Page)

1. **Update Results Page UI:**
   - Show scene thumbnails with transition indicators
   - Display "Scene 1 → Scene 2" labels
   - Show progress for each transition independently

2. **Implement Kling Generation:**
   - Replace Seedance calls with `generateKlingTransitions`
   - Pass storyboard images from campaign data
   - Handle N-1 videos instead of fixed 2-3

3. **Progress Tracking:**
   - Poll `checkKlingTransitionsStatus` every 5 seconds
   - Show individual progress for each transition
   - Update UI as each video completes

4. **Video Display:**
   - Show transitions in sequential order
   - Allow playback of individual transitions
   - Provide option to regenerate failed transitions

5. **Download/Export:**
   - Offer combined video export (stitch transitions together)
   - Individual transition downloads
   - Upload final videos to S3 for permanence

## Testing Checklist

- [x] Firebase function `generateKlingTransitions` created
- [x] Firebase function `checkKlingTransitionsStatus` created
- [x] Transition prompt generation working
- [x] Kling model version correct (939cd18...)
- [ ] Results page updated to call Kling functions
- [ ] Progress polling implemented
- [ ] Video display UI shows transitions in order
- [ ] Error handling for failed transitions
- [ ] Cost display accurate
- [ ] S3 upload for completed transition videos
- [ ] Dashboard shows transition videos
- [ ] End-to-end test: form → storyboard → transitions → download

## Example Complete Flow

```
1. User fills form:
   - Product: "EcoBottle"
   - Scenes: 5

2. Storyboard generated:
   - Scene 1: Morning dew on bottle (mood: fresh)
   - Scene 2: Person hiking with bottle (mood: adventurous)
   - Scene 3: Water pouring closeup (mood: refreshing)
   - Scene 4: Bottle in backpack (mood: practical)
   - Scene 5: Logo reveal (mood: confident)

3. Images uploaded to S3:
   - s3://vid-ad/scenes/user123/campaign456/scene-1.jpg
   - s3://vid-ad/scenes/user123/campaign456/scene-2.jpg
   - s3://vid-ad/scenes/user123/campaign456/scene-3.jpg
   - s3://vid-ad/scenes/user123/campaign456/scene-4.jpg
   - s3://vid-ad/scenes/user123/campaign456/scene-5.jpg

4. User clicks "Generate Video"

5. generateKlingTransitions called:
   - Creates 4 transitions (5 scenes - 1)
   - Total: 20 seconds of video
   - Cost: $1.40

6. Results page polls every 5 seconds:
   - Transition 1: Processing... 0%
   - Transition 2: Processing... 0%
   - Transition 3: Processing... 0%
   - Transition 4: Processing... 0%

   ... 30 seconds later ...

   - Transition 1: ✅ Complete
   - Transition 2: Processing... 60%
   - Transition 3: Processing... 30%
   - Transition 4: Starting...

   ... 2 minutes later ...

   - Transition 1: ✅ Complete
   - Transition 2: ✅ Complete
   - Transition 3: ✅ Complete
   - Transition 4: ✅ Complete

7. All transition videos uploaded to S3

8. User can:
   - Play each transition individually
   - Download combined video
   - Share on social media
   - Generate new variations
```

## Conclusion

The Kling transition system creates a cohesive, cinematic video from storyboard images by generating smooth transitions between scenes. This approach delivers higher quality results than standalone video clips while maintaining similar cost efficiency.

**Key Innovation:** Using each scene image as the `start_image` for the next transition ensures visual continuity and tells a complete story rather than showing disconnected clips.

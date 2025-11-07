# Video Ad Generation Flow Documentation

## Overview
The `/generate` endpoint is a comprehensive 7-step video ad creation workflow that guides users from initial product information through AI-powered concept selection and storyboarding to final video generation using Replicate's Seedance models.

---

## Complete User Journey

### Phase 1: Form Input (`/generate`)
Users complete a multi-step form to define their video ad campaign.

### Phase 2: Scene Review (`/generate/review`)
AI generates scene images based on form data; users select and order scenes.

### Phase 3: Video Generation (`/generate/results`)
Replicate generates videos from selected scenes.

### Phase 4: Enhancement (`/generate/voiceover`)
Users can add professional voiceover to completed videos.

---

## Step-by-Step Form Inputs

### Step 1: Product Information
**Purpose:** Capture essential product details

| Field | Type | Validation | Required | Description |
|-------|------|------------|----------|-------------|
| `productName` | string | 1-100 chars | ✅ Yes | Name of the product being advertised |
| `productDescription` | string | 10-500 chars | ✅ Yes | Detailed description of the product and its features |
| `keywords` | string → array | 1-10 keywords | ✅ Yes | Comma-separated keywords (transformed to array) |

**Example:**
```json
{
  "productName": "EcoBottle Pro",
  "productDescription": "A sustainable, insulated water bottle that keeps drinks cold for 24 hours and hot for 12 hours. Made from recycled stainless steel with a leak-proof design.",
  "keywords": "sustainable, eco-friendly, insulated, stainless steel"
}
```

---

### Step 2: Brand Settings
**Purpose:** Define brand identity and visual style

| Field | Type | Options/Validation | Required | Default | Description |
|-------|------|-------------------|----------|---------|-------------|
| `brandTone` | enum | professional, casual, playful, luxury, energetic, minimalist | ✅ Yes | professional | Overall tone and style of the ad |
| `primaryColor` | string | Hex color (#RRGGBB) | ✅ Yes | #000000 | Primary brand color for visual consistency |

**Brand Tone Options:**
- **professional**: Corporate, trustworthy, formal
- **casual**: Relaxed, friendly, approachable
- **playful**: Fun, energetic, youthful
- **luxury**: Premium, sophisticated, elegant
- **energetic**: Dynamic, exciting, high-energy
- **minimalist**: Clean, simple, modern

**Example:**
```json
{
  "brandTone": "energetic",
  "primaryColor": "#FF6B6B"
}
```

---

### Step 3: Additional Options
**Purpose:** Add optional enhancements

| Field | Type | Options/Validation | Required | Default | Description |
|-------|------|-------------------|----------|---------|-------------|
| `logoFile` | File | Any image format | ❌ No | undefined | Brand logo upload (not currently used) |
| `productImages` | File[] | Multiple images | ❌ No | [] | Product photos (not currently used) |
| `includeVoiceover` | boolean | true/false | ❌ No | true | Whether to add AI voiceover |
| `voiceStyle` | enum | alloy, echo, fable, onyx, nova, shimmer | ❌ No | alloy | OpenAI TTS voice style |
| `includeBackgroundMusic` | boolean | true/false | ❌ No | true | Add background music |
| `callToAction` | string | Max 50 chars | ❌ No | undefined | Text for CTA overlay |
| `targetAudience` | string | Max 200 chars | ❌ No | undefined | Description of target demographic |

**Voice Style Preview:**
- **alloy**: Neutral, balanced voice
- **echo**: Professional male voice
- **fable**: Warm, storytelling voice
- **onyx**: Deep, authoritative voice
- **nova**: Friendly female voice
- **shimmer**: Energetic, upbeat voice

**Example:**
```json
{
  "includeVoiceover": true,
  "voiceStyle": "nova",
  "includeBackgroundMusic": true,
  "callToAction": "Shop Now - Limited Time Offer",
  "targetAudience": "Health-conscious millennials aged 25-40"
}
```

---

### Step 4: Review
**Purpose:** Review all form data and add creative direction

| Field | Type | Validation | Required | Description |
|-------|------|------------|----------|-------------|
| `creativeDirection` | string | Free text | ❌ No | Additional instructions for AI concept generation |

**Example:**
```json
{
  "creativeDirection": "Focus on outdoor adventure scenes with natural lighting. Show the product in action during hiking and camping activities."
}
```

---

### Step 5: Concept Selection
**Purpose:** AI generates creative concepts; user selects one and chooses number of scenes

| Field | Type | Options/Validation | Required | Default | Description |
|-------|------|-------------------|----------|---------|-------------|
| `numberOfScenes` | number | 3-10 scenes | ✅ Yes | 5 | Number of scene images to generate for storyboard |
| `selectedConcept` | object | One of 3 AI-generated concepts | ✅ Yes | null | Chosen creative direction |

**Process:**
1. User selects number of scenes using:
   - Slider control (3-10 range)
   - Quick select buttons (3, 5, 7, 10)
   - Real-time preview of selected count
2. AI analyzes all form data + creative direction
3. Generates 3 creative concepts with:
   - Concept tagline
   - Narrative arc
   - Visual style
   - Target emotion
   - Scene breakdown
4. User selects preferred concept
5. System uses numberOfScenes for next step (not concept's sceneBreakdown length)

**Number of Scenes:**
- **Minimum:** 3 scenes (quick, simple story)
- **Default:** 5 scenes (balanced detail)
- **Maximum:** 10 scenes (detailed, complex story)
- **Generation time:** ~2-3 seconds per scene
- **Example:** 7 scenes = ~14-21 seconds generation time

**Concept Structure:**
```json
{
  "id": "concept_123",
  "tagline": "Adventure Awaits",
  "narrativeArc": "Follow a day in the life of an adventurer using EcoBottle Pro",
  "visualStyle": "Cinematic outdoor scenes with golden hour lighting",
  "targetEmotion": "Aspirational",
  "sceneBreakdown": [
    "Sunrise mountain peak",
    "Product closeup with condensation",
    "Action shot during hike",
    "Hydration moment",
    "Sunset triumph"
  ]
}
```

**Example User Selection:**
```json
{
  "numberOfScenes": 7,
  "selectedConcept": {
    "id": "concept_123",
    "tagline": "Adventure Awaits",
    ...
  }
}
```

---

### Step 6: Storyboard
**Purpose:** AI generates scene images; user reviews and orders

**Process:**
1. Based on selected concept and user-selected numberOfScenes, AI generates scene images via Replicate
2. Each scene includes:
   - Scene number
   - AI-generated image (9:16, portrait)
   - Prompt used
   - Description
   - Camera angle
   - Lighting notes
   - Mood

3. User can:
   - Select/deselect scenes (minimum 2)
   - Reorder scenes (drag/drop or move buttons)
   - Regenerate individual scenes
   - Save campaign or proceed to video generation

**Scene Structure:**
```json
{
  "id": "scene_abc123",
  "url": "https://replicate.delivery/...",
  "prompt": "Professional cinematic opening shot of EcoBottle Pro on mountain peak...",
  "sceneNumber": 1,
  "description": "Opening establishing shot",
  "cameraAngle": "Wide angle, low perspective",
  "lighting": "Golden hour, natural backlight",
  "mood": "Epic, aspirational"
}
```

---

### Step 7: Video Configuration
**Purpose:** Define technical video specifications after reviewing scenes

| Field | Type | Options/Validation | Required | Default | Description |
|-------|------|-------------------|----------|---------|-------------|
| `variations` | number | 1-3 | ✅ Yes | 1 | Number of video variations to generate |
| `duration` | number | 5-10 seconds | ✅ Yes | 7 | Length of each video in seconds |
| `orientation` | enum | portrait, landscape, square | ✅ Yes | landscape | Video aspect ratio |
| `resolution` | enum | 720p, 1080p, 4k | ✅ Yes | 1080p | Video quality/resolution |
| `frameRate` | number | 24, 30, 60 fps | ✅ Yes | 30 | Video frame rate |
| `videoModel` | enum | seedance-1-lite, seedance-1-pro | ✅ Yes | seedance-1-lite | Replicate AI model to use |

**Orientation Details:**
- **portrait**: 9:16 aspect ratio (ideal for mobile/TikTok/Instagram Stories)
- **landscape**: 16:9 aspect ratio (ideal for YouTube/web)
- **square**: 1:1 aspect ratio (ideal for Instagram feed)

**Model Comparison:**
| Feature | seedance-1-lite | seedance-1-pro |
|---------|----------------|----------------|
| Quality | Good | Excellent |
| Speed | Faster (~10s) | Slower (~20s) |
| Cost (720p) | $0.036/sec | $0.06/sec |
| Cost (1080p) | $0.072/sec | $0.15/sec |

**Example:**
```json
{
  "variations": 2,
  "duration": 7,
  "orientation": "portrait",
  "resolution": "1080p",
  "frameRate": 30,
  "videoModel": "seedance-1-lite"
}
```

**Cost Estimation:**
```
Cost = (price per second) × duration × variations
Example: $0.072 × 7 × 2 = $1.008
```

**Why This Step Comes Last:**
After reviewing your storyboard and selected scenes, you can now make informed decisions about:
- Video orientation based on scene composition
- Duration that matches the number of scenes
- Quality level appropriate for the content
- Number of variations to generate

---

## Complete Data Flow

### 1. Form Submission (`/generate` → Campaign Creation)

**Action:** User completes form and clicks "Generate Video"

**Process:**
```javascript
// Generate unique campaign ID
const campaignId = crypto.randomUUID();

// Prepare campaign data
const campaignData = {
  id: campaignId,
  createdAt: Date.now(),
  ...formData,
  selectedConcept: selectedConcept,
  storyboardImages: storyboardImages,
  status: 'draft'
};

// Save to localStorage
localStorage.setItem(`campaign_${campaignId}`, JSON.stringify(campaignData));

// Save to Firestore (for persistence)
await saveCampaignFn({ campaignId, campaignData });

// Redirect
window.location.href = `/generate/results/?campaignId=${campaignId}`;
```

**Storage:**
- **localStorage**: Immediate access, fast
- **Firestore**: Persistent, cross-device (via Firebase Functions)

---

### 2. Scene Review (`/generate/review`)

**URL:** `/generate/review?campaignId=xxx`

**Process:**
```javascript
// Load campaign data
const campaignData = localStorage.getItem(`campaign_${campaignId}`);

// Check if images already generated
const existingImages = localStorage.getItem(`campaign_${campaignId}_images`);

if (!existingImages) {
  // Call Firebase Cloud Function to generate scenes
  const response = await fetch(
    'https://us-central1-vid-ad.cloudfunctions.net/generateScenes',
    {
      method: 'POST',
      body: JSON.stringify({
        formData: campaignData,
        numberOfScenes: 5
      })
    }
  );

  const { images } = await response.json();

  // Save generated images
  localStorage.setItem(`campaign_${campaignId}_images`, JSON.stringify(images));
  setImages(images);
  setSelectedImages(new Set(images.map(img => img.id))); // All selected by default
}
```

**User Actions:**
- Toggle image selection (minimum 2 required)
- Reorder scenes (updates sceneNumber)
- Regenerate individual scenes (calls Cloud Function)
- Save campaign to library
- Proceed to video generation

**Save Selected Scenes:**
```javascript
const selected = images.filter(img => selectedImages.has(img.id));
localStorage.setItem(`campaign_${campaignId}_selected_images`, JSON.stringify(selected));
router.push(`/generate/results/?campaignId=${campaignId}`);
```

---

### 3. Video Generation (`/generate/results`)

**URL:** `/generate/results?campaignId=xxx`

**Process Overview:**

#### Phase A: Load Campaign & Images
```javascript
// Load campaign data
const campaignData = localStorage.getItem(`campaign_${campaignId}`);

// Load selected images
const selectedImages = localStorage.getItem(`campaign_${campaignId}_selected_images`);
```

#### Phase B: User Reviews & Starts Generation

**UI Display:**
- Preview of selected scenes
- Campaign settings summary
- "Start Video Generation" button
- Option to go back to scene review

**User Action:** Click "Start Video Generation"

#### Phase C: Initialize Video Generation

```javascript
// Generate prompts for each variation
const generateVideoPrompts = () => {
  const brandTone = campaignData.brandTone || 'professional';
  const productName = campaignData.productName;
  const description = campaignData.productDescription;

  const prompts = [
    `${brandTone} cinematic opening: ${productName} displayed prominently. ${description}. Professional lighting, clean composition, high-quality presentation...`,

    `${brandTone} detail sequence: Close-up highlights of ${productName} features and benefits...`,

    `${brandTone} lifestyle moment: ${productName} in real-world usage scenario...`
  ];

  return prompts.slice(0, campaignData.variations);
};

const prompts = generateVideoPrompts();
```

#### Phase D: Submit to Replicate

```javascript
for (let i = 0; i < variations; i++) {
  // Map orientation to aspect ratio
  const aspectRatio = {
    'portrait': '9:16',
    'landscape': '16:9',
    'square': '1:1'
  }[campaignData.orientation];

  // Prepare Replicate parameters
  const replicateParams = {
    prompt: prompts[i],
    duration: campaignData.duration,
    aspectRatio: aspectRatio,
    resolution: campaignData.resolution,
    model: campaignData.videoModel
  };

  // Start video generation
  const result = await replicateService.generateVideo(replicateParams);

  initialVideos.push({
    id: result.id,
    url: '',
    status: 'generating',
    progress: 0,
    metadata: { ...replicateParams, cost: result.metadata.cost }
  });
}
```

#### Phase E: Poll for Completion

```javascript
// Poll each video individually (parallel)
const pollVideo = async (video, index) => {
  // Wait for completion (20 min timeout)
  const status = await replicateService.waitForCompletion(video.id, 1200000);

  // Upload to S3 (via Firebase Function)
  const uploadResult = await uploadVideoToS3({
    videoUrl: status.url,
    campaignId,
    videoId: video.id,
    thumbnailUrl: status.thumbnail
  });

  // Update video state
  setVideos(prevVideos =>
    prevVideos.map(v =>
      v.id === video.id ? {
        ...v,
        url: uploadResult.videoUrl,
        thumbnail: uploadResult.thumbnailUrl,
        status: 'completed',
        progress: 100
      } : v
    )
  );

  // Save to campaign
  updateCampaignStatus('generating', { videos: updatedVideos });
};

// Start polling all videos in parallel
await Promise.allSettled(
  initialVideos.map((video, index) => pollVideo(video, index))
);

// Mark campaign as completed
updateCampaignStatus('completed', { videos: allVideos });
```

#### Phase F: Results Display

**UI Shows:**
- Video player for each completed video
- Download button
- Regenerate button
- "Add Voiceover" button
- Generation summary (total videos, cost, time)

**User Actions:**
- Download video (opens in new tab)
- Regenerate video (starts new Replicate job)
- Add voiceover → `/generate/voiceover?videoId=xxx&campaignId=xxx`
- Generate new campaign
- Back to dashboard

---

### 4. Voiceover Addition (`/generate/voiceover`)

**URL:** `/generate/voiceover?videoId=xxx&campaignId=xxx`

**Process:**
1. Load video data from campaign
2. Display VoiceoverWorkflow component
3. User inputs voiceover script
4. Generate voiceover with OpenAI TTS
5. Merge audio with video
6. Download final result

**Component:** `VoiceoverWorkflow` (handles voiceover generation)

---

## System Architecture

### Data Storage

#### LocalStorage Keys
```javascript
// Campaign data
`campaign_${campaignId}` → Full campaign data

// Generated scene images
`campaign_${campaignId}_images` → Array of 5 generated scenes

// Selected scenes for video
`campaign_${campaignId}_selected_images` → User-selected subset

// Active campaign
`activeCampaignId` → Current campaign being worked on

// Draft form data (temporary)
`adGenerationDraft` → Auto-saved form progress
```

#### Firestore Structure
```
campaigns/
  └── {campaignId}/
      ├── id: string
      ├── createdAt: timestamp
      ├── updatedAt: timestamp
      ├── status: 'draft' | 'generating' | 'completed' | 'failed'
      ├── productName: string
      ├── productDescription: string
      ├── brandTone: string
      ├── videos: Array<{
      │   id: string
      │   url: string
      │   status: string
      │   thumbnail: string
      │   metadata: object
      │ }>
      └── ...all form fields
```

### API Endpoints

#### Next.js API Routes (not used in Cloud Functions)
- `/api/generate-scenes` → Generates scene images (backup)
- `/api/regenerate-scene` → Regenerates single scene (backup)

#### Firebase Cloud Functions
- `generateScenes` → AI scene generation
  - **URL:** `https://us-central1-vid-ad.cloudfunctions.net/generateScenes`
  - **Method:** POST
  - **Body:** `{ formData, numberOfScenes }`
  - **Returns:** `{ success, images[] }`

- `regenerateScene` → Regenerate single scene
  - **URL:** `https://us-central1-vid-ad.cloudfunctions.net/regenerateScene`
  - **Method:** POST
  - **Body:** `{ originalPrompt, sceneNumber }`
  - **Returns:** `{ success, image }`

- `saveCampaign` → Save campaign to Firestore
- `getCampaign` → Load campaign from Firestore
- `updateCampaign` → Update campaign status
- `uploadVideoToS3` → Upload completed video to S3

### External Services

#### Replicate API
**Purpose:** AI video generation

**Service:** `ReplicateVideoService` (singleton)

**Methods:**
```javascript
// Generate video
await replicateService.generateVideo({
  prompt: string,
  duration: number,
  aspectRatio: '16:9' | '9:16' | '1:1',
  resolution: '480p' | '720p' | '1080p',
  model: 'seedance-1-lite' | 'seedance-1-pro'
});

// Check status
await replicateService.getStatus(predictionId);

// Wait for completion
await replicateService.waitForCompletion(predictionId, timeout);
```

**Pricing (per second):**
| Model | 480p | 720p | 1080p |
|-------|------|------|-------|
| seedance-1-lite | $0.018 | $0.036 | $0.072 |
| seedance-1-pro | $0.03 | $0.06 | $0.15 |

#### OpenAI API
**Purpose:**
- Prompt enhancement for scene generation
- TTS for voiceover

**Used In:**
- Scene prompt generation (GPT-4)
- Voice synthesis (TTS-1)

---

## Error Handling

### Form Validation Errors
```javascript
// Zod validation catches:
- Missing required fields
- Invalid data types
- Out-of-range values
- Invalid formats (hex color, etc.)

// User sees:
alert('Please fix the following errors:\n\n' +
  Object.entries(errors)
    .map(([field, error]) => `${field}: ${error.message}`)
    .join('\n')
);
```

### API Errors
```javascript
try {
  // API call
} catch (error) {
  console.error('Error:', error);
  alert(`Failed: ${error.message}`);
  // Continue with fallback or redirect
}
```

### Replicate Generation Errors
```javascript
// If video generation fails:
setVideos(prevVideos =>
  prevVideos.map(v =>
    v.id === failedVideoId
      ? { ...v, status: 'failed', progress: 0 }
      : v
  )
);

// User can click "Regenerate" to retry
```

### Firestore Errors (Non-blocking)
```javascript
// If Firestore save fails:
console.warn('⚠️ Failed to save to Firestore (continuing with localStorage):', error);
// Continue with localStorage only
```

---

## Performance Considerations

### Generation Times
- **Scene Images:** ~10-15 seconds for 5 images
- **Video Generation:** ~10-20 minutes per video (depends on model)
  - seedance-1-lite: ~10 seconds
  - seedance-1-pro: ~20 seconds

### Parallel Processing
- Scene images: Generated in parallel (5 at once)
- Videos: Generated in parallel (up to 3 at once)
- Polling: Each video polled independently

### Caching
- Campaign data cached in localStorage
- Scene images cached after generation
- Form draft auto-saved on changes

---

## Future Enhancements

### Planned Features
- [ ] Use uploaded product images in generation
- [ ] Use uploaded logo in video overlay
- [ ] Background music selection and mixing
- [ ] Advanced editing (trim, crop, filters)
- [ ] Batch campaign management
- [ ] Export to multiple platforms (YouTube, Instagram, TikTok)

### Technical Improvements
- [ ] Optimize image generation (batch requests)
- [ ] Add progress bars for individual videos
- [ ] Implement video preview before full generation
- [ ] Add cost calculator on form
- [ ] Resume interrupted generations

---

## Troubleshooting

### Common Issues

**Issue:** "Campaign not found"
- **Cause:** localStorage cleared or different browser/device
- **Solution:** Check Firestore; campaign data should load automatically

**Issue:** Scene images not loading
- **Cause:** Replicate API rate limit or network error
- **Solution:** Retry generation; images are cached after first success

**Issue:** Video generation stuck
- **Cause:** Replicate queue delay or API timeout
- **Solution:** Refresh page; generation resumes automatically

**Issue:** "Select at least 2 images"
- **Cause:** User deselected too many scenes
- **Solution:** Select minimum 2 scenes to proceed

---

## Mermaid Flow Diagram

```mermaid
flowchart TD
    Start([User visits /generate]) --> CheckDraft{Draft exists?}

    CheckDraft -->|Yes| LoadDraft[Load draft from localStorage]
    CheckDraft -->|No| Step1[Step 1: Product Info]
    LoadDraft --> Step1

    Step1 --> |Fill: productName, productDescription, keywords| ValidateStep1{Valid?}
    ValidateStep1 -->|No| Step1
    ValidateStep1 -->|Yes| Step2[Step 2: Brand Settings]

    Step2 --> |Fill: brandTone, primaryColor| ValidateStep2{Valid?}
    ValidateStep2 -->|No| Step2
    ValidateStep2 -->|Yes| Step3[Step 3: Additional Options]

    Step3 --> |Fill: voiceover, voiceStyle, backgroundMusic, CTA, targetAudience| Step4[Step 4: Review]

    Step4 --> |Add: creativeDirection| Step5[Step 5: Concept Selection]

    Step5 --> SelectNumberOfScenes[Select Number of Scenes: 3-10]
    SelectNumberOfScenes --> |User chooses via slider/quick buttons| DisplayConcepts[AI generates 3 concepts]
    DisplayConcepts --> UserSelectConcept{User selects concept}
    UserSelectConcept -->|Not selected| DisplayConcepts
    UserSelectConcept -->|Selected| Step6[Step 6: Storyboard]

    Step6 --> |AI generates user-selected # of scene images| DisplayScenes[Display Scene Images]
    DisplayScenes --> ReviewScenes{User reviews scenes}
    ReviewScenes -->|Regenerate| RegenerateScene[Call regenerateScene API]
    RegenerateScene --> DisplayScenes
    ReviewScenes -->|Select/Reorder| ValidateSelection{Min 2 selected?}
    ValidateSelection -->|No| DisplayScenes
    ValidateSelection -->|Yes| Step7[Step 7: Video Config]

    Step7 --> |Fill: variations, duration, orientation, resolution, frameRate, videoModel| ValidateStep7{Valid?}
    ValidateStep7 -->|No| Step7
    ValidateStep7 -->|Yes| SubmitForm[Submit Form]

    SubmitForm --> GenerateCampaignId[Generate campaignId = crypto.randomUUID]
    GenerateCampaignId --> SaveLocalStorage[Save to localStorage: campaign_xxx]
    SaveLocalStorage --> SaveFirestore[Save to Firestore via saveCampaign function]
    SaveFirestore --> SaveSelected[Save selected images: campaign_xxx_selected_images]
    SaveSelected --> ClearDraft[Clear draft: adGenerationDraft]
    ClearDraft --> RedirectResults[Redirect to /generate/results?campaignId=xxx]

    RedirectResults --> ResultsPage[/generate/results]
    ResultsPage --> LoadCampaign[Load campaign from localStorage]
    LoadCampaign --> LoadSelectedImages[Load selected images]
    LoadSelectedImages --> DisplayReview[Display Scene Review]

    DisplayReview --> UserClickStart{User clicks Start Generation?}
    UserClickStart -->|Back to Review| ReviewPage[/generate/review]
    UserClickStart -->|Start| InitVideos[Initialize Video Generation]

    InitVideos --> GeneratePrompts[Generate prompts for each variation]
    GeneratePrompts --> LoopVariations[Loop: for each variation]
    LoopVariations --> ReplicateParams[Prepare Replicate params: prompt, duration, aspectRatio, resolution, model]
    ReplicateParams --> CallReplicate[Call replicateService.generateVideo]
    CallReplicate --> CreateVideoObj[Create video object: id, status=generating, progress=0]
    CreateVideoObj --> CheckMoreVariations{More variations?}
    CheckMoreVariations -->|Yes| LoopVariations
    CheckMoreVariations -->|No| UpdateStatus[Update campaign status: generating]

    UpdateStatus --> PollVideos[Start polling all videos in parallel]
    PollVideos --> LoopPolling[Loop: for each video]
    LoopPolling --> WaitCompletion[Wait for replicateService.waitForCompletion]
    WaitCompletion --> UploadS3[Upload to S3 via uploadVideoToS3 function]
    UploadS3 --> UpdateVideoState[Update video: status=completed, url, thumbnail, progress=100]
    UpdateVideoState --> SaveCampaignVideo[Save video to campaign in localStorage & Firestore]
    SaveCampaignVideo --> CheckMorePolling{More videos polling?}
    CheckMorePolling -->|Yes| LoopPolling
    CheckMorePolling -->|No| AllCompleted[All videos completed]

    AllCompleted --> UpdateFinalStatus[Update campaign status: completed]
    UpdateFinalStatus --> DisplayResults[Display Video Results]

    DisplayResults --> UserAction{User Action?}
    UserAction -->|Download| DownloadVideo[Open video URL in new tab]
    UserAction -->|Regenerate| RegenerateVideo[Call replicateService.generateVideo again]
    RegenerateVideo --> PollVideos
    UserAction -->|Add Voiceover| VoiceoverPage[/generate/voiceover?videoId=xxx]
    UserAction -->|New Campaign| NewCampaign[/generate?new=true]
    UserAction -->|Dashboard| Dashboard[/dashboard]

    VoiceoverPage --> LoadVideoData[Load video data from campaign]
    LoadVideoData --> VoiceoverWorkflow[Display VoiceoverWorkflow component]
    VoiceoverWorkflow --> UserInputScript[User inputs voiceover script]
    UserInputScript --> GenerateTTS[Generate TTS with OpenAI]
    GenerateTTS --> MergeAudio[Merge audio with video]
    MergeAudio --> DownloadFinal[Download final video with voiceover]

    ReviewPage --> LoadCampaignReview[Load campaign from localStorage]
    LoadCampaignReview --> CheckImagesGenerated{Images generated?}
    CheckImagesGenerated -->|Yes| LoadImages[Load images from localStorage]
    CheckImagesGenerated -->|No| CallGenerateScenes[Call Firebase generateScenes function]
    CallGenerateScenes --> SaveImages[Save images to localStorage]
    SaveImages --> LoadImages
    LoadImages --> DisplayGallery[Display image gallery]
    DisplayGallery --> UserReviewAction{User Action?}
    UserReviewAction -->|Toggle selection| UpdateSelection[Update selectedImages set]
    UserReviewAction -->|Reorder| MoveImage[Update scene numbers]
    UserReviewAction -->|Regenerate| CallRegenerateScene[Call Firebase regenerateScene function]
    CallRegenerateScene --> DisplayGallery
    UserReviewAction -->|Save Campaign| SaveCampaignLibrary[Save to Firestore campaigns library]
    UserReviewAction -->|Proceed to Video| SaveSelectedProceed[Save selected images]
    SaveSelectedProceed --> RedirectResultsFinal[Redirect to /generate/results]

    DownloadVideo --> End([End])
    DownloadFinal --> End
    NewCampaign --> Start
    Dashboard --> End

    style Start fill:#e1f5e1
    style End fill:#ffe1e1
    style Step1 fill:#e3f2fd
    style Step2 fill:#e3f2fd
    style Step3 fill:#e3f2fd
    style Step4 fill:#e3f2fd
    style Step5 fill:#fff3e0
    style Step6 fill:#fff3e0
    style Step7 fill:#e3f2fd
    style ResultsPage fill:#f3e5f5
    style VoiceoverPage fill:#e8f5e9
    style ReviewPage fill:#fff9c4
```

---

## Quick Reference

### Key Files
- **Form Page:** `/app/generate/page.tsx`
- **Form Component:** `/components/AdGenerationForm.tsx`
- **Form Schema:** `/lib/schemas/adGenerationSchema.ts`
- **Review Page:** `/app/generate/review/page.tsx`
- **Results Page:** `/app/generate/results/page.tsx`
- **Voiceover Page:** `/app/generate/voiceover/page.tsx`
- **API Route:** `/app/api/generate-scenes/route.ts`
- **Replicate Service:** `/lib/services/replicateVideoService.ts`

### Environment Variables Required
```env
REPLICATE_API_TOKEN=r8_***
OPENAI_API_KEY=sk-***
FIREBASE_PROJECT_ID=vid-ad
AWS_ACCESS_KEY_ID=***
AWS_SECRET_ACCESS_KEY=***
AWS_REGION=us-west-2
S3_BUCKET_NAME=vid-ad-videos
```

### Form Step Summary
1. **Product Info** - Name, description, keywords
2. **Brand Settings** - Tone, color
3. **Additional Options** - Voiceover, music, CTA
4. **Review** - Review + creative direction
5. **Concept Selection** - Choose number of scenes (3-10), AI concepts, user picks one
6. **Storyboard** - AI generates selected # of scene images, user selects/orders
7. **Video Config** - Duration, resolution, model (configured after seeing scenes)

### Page Flow Summary
```
/generate → /generate/review → /generate/results → /generate/voiceover
   (Form)      (Scene review)    (Video gen)        (Optional)
```

---

**Last Updated:** 2025-11-07
**Version:** 1.0
**Status:** Production

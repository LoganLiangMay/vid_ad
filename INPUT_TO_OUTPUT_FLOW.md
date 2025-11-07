# Complete Input-to-Output Flow Documentation
## Video Ad Generation System with AWS S3 Storage

---

## Table of Contents
1. [System Overview](#system-overview)
2. [All Form Inputs](#all-form-inputs)
3. [Image Generation Flow](#image-generation-flow)
4. [Video Generation Flow](#video-generation-flow)
5. [AWS S3 Storage](#aws-s3-storage)
6. [Complete Data Journey](#complete-data-journey)
7. [Storage Architecture](#storage-architecture)

---

## System Overview

This system takes user inputs through a 7-step form and generates:
1. **AI-powered creative concepts** (3 options, user selects 1)
2. **Scene storyboard images** (3-10 images) via Replicate Nano Banana
3. **Final video ads** (1-3 variations) via Replicate Seedance
4. **Optional voiceover** via OpenAI TTS

**External Services Used:**
- **Replicate** - Image & video generation
- **OpenAI** - AI prompts & voiceover
- **AWS S3** - Permanent video storage
- **Firebase** - Authentication, Firestore, Functions

---

## All Form Inputs

### Complete Form Data Structure

```typescript
interface AdGenerationFormData {
  // ========== STEP 1: PRODUCT INFO ==========
  productName: string;              // "EcoBottle Pro"
  productDescription: string;        // "Sustainable insulated bottle..."
  keywords: string[];               // ["sustainable", "eco-friendly"]

  // ========== STEP 2: BRAND SETTINGS ==========
  brandTone: BrandTone;             // professional | casual | playful | luxury | energetic | minimalist
  primaryColor: string;             // "#FF6B6B" (hex color)

  // ========== STEP 3: ADDITIONAL OPTIONS ==========
  logoFile?: File;                  // Brand logo upload (optional, not yet implemented)
  productImages?: File[];           // Product photos (optional, not yet implemented)
  includeVoiceover: boolean;        // true/false
  voiceStyle?: VoiceStyle;          // alloy | echo | fable | onyx | nova | shimmer
  includeBackgroundMusic: boolean;  // true/false
  callToAction?: string;            // "Shop Now" (max 50 chars)
  targetAudience?: string;          // "Health-conscious millennials" (max 200 chars)

  // ========== STEP 4: REVIEW ==========
  creativeDirection?: string;       // Additional AI instructions

  // ========== STEP 5: CONCEPT SELECTION ==========
  numberOfScenes: number;           // 3-10 (user selects via slider)
  selectedConcept: Concept;         // AI-generated concept

  // ========== STEP 6: STORYBOARD ==========
  storyboardImages: SceneImage[];   // Selected scene images

  // ========== STEP 7: VIDEO CONFIG ==========
  variations: number;               // 1-3 video variations
  duration: number;                 // 5-10 seconds
  orientation: Orientation;         // portrait | landscape | square
  resolution: Resolution;           // 720p | 1080p | 4k
  frameRate: number;                // 24 | 30 | 60 fps
  videoModel: ReplicateModel;       // seedance-1-lite | seedance-1-pro
}
```

---

## Image Generation Flow

### Phase 1: Concept Generation (Step 5)

**Inputs Used:**
```javascript
{
  productName: "EcoBottle Pro",
  productDescription: "Sustainable insulated water bottle...",
  keywords: ["sustainable", "eco-friendly", "insulated"],
  brandTone: "energetic",
  targetAudience: "Health-conscious millennials aged 25-40",
  duration: 7,
  creativeDirection: "Focus on outdoor adventure scenes"
}
```

**Process:**
1. **AI Prompt Construction** (OpenAI GPT-4):
```javascript
const systemPrompt = `You are a creative director specializing in video ads.
Create 3 unique concepts for a video ad with these specs:
- Product: ${productName}
- Description: ${productDescription}
- Brand Tone: ${brandTone}
- Target Audience: ${targetAudience}
- Duration: ${duration}s
- Creative Direction: ${creativeDirection}

For each concept, provide:
- Tagline
- Narrative Arc
- Visual Style
- Target Emotion
- Scene Breakdown (${numberOfScenes} scenes)
`;
```

2. **AI Response** (3 concepts):
```json
{
  "concepts": [
    {
      "id": "concept_1",
      "tagline": "Adventure Awaits",
      "narrativeArc": "Follow a day in the life of an adventurer",
      "visualStyle": "Cinematic outdoor scenes with golden hour lighting",
      "targetEmotion": "Aspirational",
      "sceneBreakdown": [
        "Sunrise on mountain peak",
        "Product closeup with condensation",
        "Action shot during hike",
        "Hydration break at scenic vista",
        "Sunset triumph with product"
      ]
    },
    // ... 2 more concepts
  ]
}
```

3. **User Selection:**
   - User also selects `numberOfScenes` (3-10) via slider
   - User picks one concept
   - System proceeds to Step 6

---

### Phase 2: Storyboard Image Generation (Step 6)

**Inputs Used:**
```javascript
{
  // All form data from previous steps
  productName: "EcoBottle Pro",
  productDescription: "...",
  brandTone: "energetic",
  primaryColor: "#FF6B6B",

  // Concept data
  selectedConcept: {
    tagline: "Adventure Awaits",
    narrativeArc: "...",
    visualStyle: "Cinematic outdoor scenes with golden hour lighting"
  },

  // User selection
  numberOfScenes: 7
}
```

**Process:**

#### Step 1: AI Scene Prompt Generation

**Firebase Function:** `generateScenes`
**API:** OpenAI GPT-4

```javascript
// Input to AI
const enhancedContext = {
  productName: "EcoBottle Pro",
  productDescription: "Sustainable insulated water bottle...",
  keywords: ["sustainable", "eco-friendly"],
  brandTone: "energetic",
  primaryColor: "#FF6B6B",
  targetAudience: "Health-conscious millennials",
  callToAction: "Shop Now",
  orientation: "portrait",
  duration: 7,

  // Concept context
  conceptTagline: "Adventure Awaits",
  conceptNarrative: "Follow a day in the life...",
  conceptVisualStyle: "Cinematic outdoor scenes..."
};

// AI generates 7 scene prompts
const aiScenes = await generateScenePromptsFromFormData(formData, 7);
```

**AI Output (7 optimized prompts):**
```json
{
  "scenes": [
    {
      "sceneNumber": 1,
      "description": "Epic sunrise moment on mountain peak",
      "imagePrompt": "Cinematic sunrise on mountain peak with silhouetted hiker holding EcoBottle Pro, golden hour lighting, dramatic sky, inspirational mood, vertical 9:16 composition, professional photography, high quality, energetic atmosphere, sustainable adventure gear visible",
      "cameraAngle": "Low angle, wide shot",
      "lighting": "Golden hour backlight",
      "mood": "Epic, inspirational"
    },
    {
      "sceneNumber": 2,
      "description": "Product closeup with dramatic lighting",
      "imagePrompt": "Macro closeup of EcoBottle Pro with water condensation droplets, dramatic side lighting, dark background with nature bokeh, product hero shot, 9:16 vertical, professional product photography, high-end commercial quality, emphasis on sustainable materials and craftsmanship",
      "cameraAngle": "Macro, 45-degree angle",
      "lighting": "Dramatic side lighting with bokeh",
      "mood": "Premium, detailed"
    },
    // ... 5 more scenes
  ]
}
```

#### Step 2: Image Generation with Replicate

**API:** Replicate Nano Banana (`google/nano-banana`)

**For Each Scene:**
```javascript
const replicateParams = {
  prompt: scene.imagePrompt, // AI-optimized prompt
  aspect_ratio: '9:16',       // Vertical for mobile
  output_format: 'png',
  output_quality: 90
};

const output = await replicate.run('google/nano-banana', {
  input: replicateParams
});

const imageUrl = Array.isArray(output) ? output[0] : output;
// imageUrl: "https://replicate.delivery/pbxt/abc123/image.png"
```

**Parallel Processing:**
- All 7 images generated simultaneously
- Takes ~14-21 seconds total (2-3 seconds per image)

**Result:**
```json
{
  "images": [
    {
      "id": "scene-1",
      "url": "https://replicate.delivery/pbxt/abc123/scene1.png",
      "prompt": "Cinematic sunrise on mountain peak...",
      "sceneNumber": 1,
      "description": "Epic sunrise moment on mountain peak",
      "cameraAngle": "Low angle, wide shot",
      "lighting": "Golden hour backlight",
      "mood": "Epic, inspirational"
    },
    // ... 6 more images
  ]
}
```

#### Step 3: Image Storage

**Current Implementation:**
```javascript
// ⚠️ IMAGES ARE NOT UPLOADED TO S3
// They remain hosted on Replicate's CDN (temporary, 24 hours)

// Stored in localStorage
localStorage.setItem(`campaign_${campaignId}_images`, JSON.stringify(images));

// Stored in Firestore
await campaignRef.update({
  storyboardImages: images,
  updatedAt: serverTimestamp()
});
```

**Storage Locations:**
1. **Replicate CDN** (temporary) - 24 hour expiration
2. **Browser localStorage** (session)
3. **Firestore** (permanent, but URLs expire)

⚠️ **Issue:** Scene images need to be uploaded to S3 for permanent storage!

---

### Input Usage in Image Generation

| Input Field | Used For | Example Impact |
|------------|----------|----------------|
| `productName` | AI prompt context | "Include 'EcoBottle Pro' in scenes" |
| `productDescription` | AI scene context | "Show insulation features, leak-proof design" |
| `keywords` | AI prompt enhancement | "Emphasize 'sustainable', 'eco-friendly' themes" |
| `brandTone` | Visual style | `energetic` → "Dynamic angles, vibrant colors, action moments" |
| `primaryColor` | Color palette | `#FF6B6B` → "Incorporate coral/red tones in composition" |
| `targetAudience` | Scene selection | "Millennials" → "Modern lifestyle, outdoor activities" |
| `callToAction` | Emotional direction | "Shop Now" → "Urgency, excitement in visuals" |
| `orientation` | Aspect ratio | `portrait` → 9:16 vertical images |
| `numberOfScenes` | Quantity | `7` → Generate 7 unique scene images |
| `selectedConcept.visualStyle` | Photography style | "Cinematic outdoor scenes" → Lighting, composition |
| `selectedConcept.narrativeArc` | Story flow | "Day in the life" → Scene progression |
| `creativeDirection` | Additional instructions | "Focus on outdoor adventure" → Scene settings |

**AI Prompt Template:**
```
Generate a {brandTone} commercial photography scene for {productName}.

Product: {productName} - {productDescription}
Keywords: {keywords.join(', ')}
Brand Tone: {brandTone}
Target Audience: {targetAudience}
Visual Style: {selectedConcept.visualStyle}

Scene {sceneNumber} of {numberOfScenes}: {sceneDescription}
Orientation: {orientation} (9:16 vertical)
Mood: {mood}
Lighting: {lighting}
Camera Angle: {cameraAngle}

Creative Direction: {creativeDirection}

Generate a professional, high-quality image that captures this moment perfectly.
```

---

## Video Generation Flow

### Phase 1: Video Prompt Generation (Step 7 → Results Page)

**Inputs Used:**
```javascript
{
  // Product info
  productName: "EcoBottle Pro",
  productDescription: "Sustainable insulated water bottle...",

  // Brand
  brandTone: "energetic",

  // Video settings (from Step 7)
  variations: 2,
  duration: 7,
  orientation: "portrait",  // → 9:16
  resolution: "1080p",
  frameRate: 30,
  videoModel: "seedance-1-lite",

  // Selected scenes (from Step 6)
  selectedImages: [ /* 7 scene images */ ]
}
```

**Process:**

#### Step 1: Generate Video Prompts

**Logic:** Create prompts for each variation
```javascript
const generateVideoPrompts = () => {
  const brandTone = formData.brandTone;        // "energetic"
  const productName = formData.productName;     // "EcoBottle Pro"
  const description = formData.productDescription;

  const prompts = [
    // Variation 1: Opening
    `${brandTone} cinematic opening: ${productName} displayed prominently. ${description}. Professional lighting, clean composition, high-quality presentation, product-focused establishing shot. Camera: smooth tracking shot, 24fps cinematic`,

    // Variation 2: Detail sequence
    `${brandTone} detail sequence: Close-up highlights of ${productName} features and benefits. ${description}. Dynamic camera movement, smooth transitions, emphasis on quality and craftsmanship. Camera: medium shot with movement, 30fps`,

    // Variation 3: Lifestyle moment
    `${brandTone} lifestyle moment: ${productName} in real-world usage scenario showing product value. ${description}. Authentic presentation, professional quality, engaging composition. Camera: wide to close-up, 24fps cinematic`
  ];

  return prompts.slice(0, formData.variations); // Return 2 prompts
};
```

**Example Prompts:**
```javascript
[
  "energetic cinematic opening: EcoBottle Pro displayed prominently. Sustainable insulated water bottle that keeps drinks cold for 24 hours. Professional lighting, clean composition, high-quality presentation, product-focused establishing shot. Camera: smooth tracking shot, 24fps cinematic",

  "energetic detail sequence: Close-up highlights of EcoBottle Pro features and benefits. Sustainable insulated water bottle that keeps drinks cold for 24 hours. Dynamic camera movement, smooth transitions, emphasis on quality and craftsmanship. Camera: medium shot with movement, 30fps"
]
```

---

### Phase 2: Replicate Video Generation

**API:** Replicate Seedance (`seedance-1-lite` or `seedance-1-pro`)

**For Each Variation:**

#### Step 1: Map Inputs to Replicate Parameters

```javascript
// Orientation mapping
const orientationToAspectRatio = {
  'portrait': '9:16',
  'landscape': '16:9',
  'square': '1:1'
};

const replicateParams = {
  prompt: prompts[i],                           // AI-generated prompt
  duration: formData.duration,                   // 7 seconds
  aspectRatio: orientationToAspectRatio[formData.orientation], // '9:16'
  resolution: formData.resolution,               // '1080p'
  model: formData.videoModel                     // 'seedance-1-lite'
};
```

#### Step 2: Submit to Replicate

```javascript
const replicateResult = await replicateService.generateVideo(replicateParams);

// Response
{
  id: "abc123def456",              // Prediction ID
  status: "starting",              // starting | processing | succeeded | failed
  url: null,                       // Video URL (when completed)
  metadata: {
    cost: 0.504,                   // $0.072/sec × 7 sec = $0.504
    model: "seedance-1-lite",
    resolution: "1080p",
    aspectRatio: "9:16"
  }
}
```

#### Step 3: Poll for Completion

```javascript
// Wait for video generation (10-20 minutes)
const status = await replicateService.waitForCompletion(
  replicateResult.id,
  1200000  // 20 minute timeout
);

// Completed response
{
  id: "abc123def456",
  status: "succeeded",
  url: "https://replicate.delivery/pbxt/xyz789/video.mp4",
  thumbnail: "https://replicate.delivery/pbxt/xyz789/thumb.jpg"
}
```

---

### Phase 3: AWS S3 Upload ✅

**Firebase Function:** `uploadVideoToS3`

**Inputs:**
```javascript
{
  videoUrl: "https://replicate.delivery/pbxt/xyz789/video.mp4",
  campaignId: "campaign_uuid",
  videoId: "abc123def456",
  thumbnailUrl: "https://replicate.delivery/pbxt/xyz789/thumb.jpg",
  userId: "user_firebase_uid"
}
```

**Process:**

#### Step 1: Download from Replicate
```javascript
// Download video
const videoResponse = await axios.get(videoUrl, {
  responseType: 'arraybuffer',
  timeout: 300000  // 5 minutes
});
const videoBuffer = Buffer.from(videoResponse.data);

// Download thumbnail
const thumbnailResponse = await axios.get(thumbnailUrl, {
  responseType: 'arraybuffer',
  timeout: 30000
});
const thumbnailBuffer = Buffer.from(thumbnailResponse.data);
```

#### Step 2: Upload to S3
```javascript
const s3Client = new S3Client({
  region: process.env.AWS_REGION,        // 'us-east-2'
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Video upload
const videoKey = `videos/${userId}/${campaignId}/${videoId}.mp4`;
await s3Client.send(new PutObjectCommand({
  Bucket: process.env.AWS_S3_BUCKET_NAME,  // 'vid-ad-videos'
  Key: videoKey,
  Body: videoBuffer,
  ContentType: 'video/mp4',
  ServerSideEncryption: 'AES256',
  Metadata: {
    userId: userId,
    campaignId: campaignId,
    videoId: videoId,
    uploadedAt: new Date().toISOString()
  }
}));

// Thumbnail upload
const thumbnailKey = `thumbnails/${userId}/${campaignId}/${videoId}.jpg`;
await s3Client.send(new PutObjectCommand({
  Bucket: process.env.AWS_S3_BUCKET_NAME,
  Key: thumbnailKey,
  Body: thumbnailBuffer,
  ContentType: 'image/jpeg',
  ServerSideEncryption: 'AES256',
  Metadata: {
    userId: userId,
    campaignId: campaignId,
    videoId: videoId
  }
}));
```

#### Step 3: Generate Permanent URLs
```javascript
// S3 URL (or CloudFront if configured)
const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN_NAME;

const s3VideoUrl = cloudFrontDomain
  ? `https://${cloudFrontDomain}/${videoKey}`
  : `https://${bucketName}.s3.${region}.amazonaws.com/${videoKey}`;

const s3ThumbnailUrl = cloudFrontDomain
  ? `https://${cloudFrontDomain}/${thumbnailKey}`
  : `https://${bucketName}.s3.${region}.amazonaws.com/${thumbnailKey}`;

// Example URLs:
// Video: https://vid-ad-videos.s3.us-east-2.amazonaws.com/videos/user123/campaign456/video789.mp4
// Thumbnail: https://vid-ad-videos.s3.us-east-2.amazonaws.com/thumbnails/user123/campaign456/video789.jpg
```

#### Step 4: Update Firestore
```javascript
await campaignRef.update({
  videos: [
    {
      id: videoId,
      url: s3VideoUrl,              // Permanent S3 URL
      thumbnail: s3ThumbnailUrl,    // Permanent S3 URL
      status: 'completed',
      s3Key: videoKey,
      uploadedAt: serverTimestamp()
    }
  ],
  updatedAt: serverTimestamp()
});
```

**Result:**
```json
{
  "success": true,
  "videoUrl": "https://vid-ad-videos.s3.us-east-2.amazonaws.com/videos/user123/campaign456/video789.mp4",
  "thumbnailUrl": "https://vid-ad-videos.s3.us-east-2.amazonaws.com/thumbnails/user123/campaign456/video789.jpg",
  "s3Key": "videos/user123/campaign456/video789.mp4"
}
```

---

### Input Usage in Video Generation

| Input Field | Used For | Example Impact |
|------------|----------|----------------|
| `productName` | Video prompt | "EcoBottle Pro displayed prominently" |
| `productDescription` | Video context | "Show insulation features in action" |
| `brandTone` | Video style | `energetic` → "Dynamic camera, fast pacing" |
| `variations` | Quantity | `2` → Generate 2 different video versions |
| `duration` | Video length | `7` → 7-second videos |
| `orientation` | Aspect ratio | `portrait` → 9:16 vertical video |
| `resolution` | Quality | `1080p` → 1920×1080 output |
| `frameRate` | Smoothness | `30` → 30fps playback |
| `videoModel` | AI model | `seedance-1-lite` → Faster, cheaper generation |
| `selectedImages` | Visual reference | Used for scene continuity (not directly by Replicate) |

**Video Prompt Template:**
```
{brandTone} {sceneType}: {productName} {action}. {productDescription}.
{technicalDetails}. Camera: {cameraMovement}, {frameRate}fps {style}
```

---

## AWS S3 Storage

### Current Storage Status

#### ✅ Videos (IMPLEMENTED)
- **Stored:** YES
- **Location:** `s3://vid-ad-videos/videos/${userId}/${campaignId}/${videoId}.mp4`
- **Uploaded by:** Firebase Function `uploadVideoToS3`
- **Encryption:** AES256
- **Permanent:** YES

#### ✅ Video Thumbnails (IMPLEMENTED)
- **Stored:** YES
- **Location:** `s3://vid-ad-videos/thumbnails/${userId}/${campaignId}/${videoId}.jpg`
- **Uploaded by:** Firebase Function `uploadVideoToS3`
- **Encryption:** AES256
- **Permanent:** YES

#### ⚠️ Scene Images (NOT IMPLEMENTED)
- **Stored:** NO
- **Current location:** Replicate CDN (temporary, 24 hours)
- **Risk:** URLs expire after 24 hours
- **Recommended:** Upload to S3 at `images/${userId}/${campaignId}/${sceneId}.png`

---

### S3 Bucket Structure

```
s3://vid-ad-videos/
├── videos/
│   └── ${userId}/
│       └── ${campaignId}/
│           ├── ${videoId1}.mp4  ← Final generated videos
│           ├── ${videoId2}.mp4
│           └── ${videoId3}.mp4
│
├── thumbnails/
│   └── ${userId}/
│       └── ${campaignId}/
│           ├── ${videoId1}.jpg  ← Video thumbnails
│           ├── ${videoId2}.jpg
│           └── ${videoId3}.jpg
│
└── images/ (RECOMMENDED TO ADD)
    └── ${userId}/
        └── ${campaignId}/
            ├── scene-1.png  ← Storyboard scene images
            ├── scene-2.png
            ├── scene-3.png
            └── ...
```

---

### S3 Configuration

**Environment Variables Required:**
```bash
# AWS Credentials
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-2

# S3 Bucket
AWS_S3_BUCKET_NAME=vid-ad-videos

# CloudFront (Optional)
CLOUDFRONT_DOMAIN_NAME=d1234567890.cloudfront.net
```

**S3 Bucket Permissions:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::ACCOUNT_ID:role/firebase-functions-role"
      },
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::vid-ad-videos/*"
    }
  ]
}
```

**CORS Configuration:**
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedOrigins": [
      "https://vid-ad.web.app",
      "https://vid-ad.firebaseapp.com"
    ],
    "ExposeHeaders": ["ETag"]
  }
]
```

---

## Complete Data Journey

### Journey Map: From Input to AWS

```
USER INPUT (Form)
    ↓
[Step 1-4] Basic Info
    ↓
[Step 5] AI Concept Generation
    ├─→ OpenAI GPT-4
    └─→ 3 concepts generated
    ↓
[User selects concept + numberOfScenes]
    ↓
[Step 6] Storyboard Generation
    ├─→ OpenAI GPT-4 (scene prompts)
    ├─→ Replicate Nano Banana (images)
    └─→ Images stored on Replicate CDN ⚠️ (temporary)
    ↓
[User selects/reorders scenes]
    ↓
[Step 7] Video Configuration
    ↓
[Results Page] Video Generation
    ├─→ Generate video prompts
    ├─→ Replicate Seedance (videos)
    ├─→ Wait for completion (10-20 min)
    ├─→ Download from Replicate
    ├─→ Upload to AWS S3 ✅ (permanent)
    ├─→ Generate S3 URLs
    └─→ Update Firestore with S3 URLs
    ↓
[Final Result]
├─→ Videos: s3://vid-ad-videos/videos/...
├─→ Thumbnails: s3://vid-ad-videos/thumbnails/...
└─→ Scene Images: Replicate CDN (expires in 24h) ⚠️
```

---

### Data Storage Locations

| Data Type | Storage Location | Permanent | Accessible Via |
|-----------|-----------------|-----------|----------------|
| **Form Data** | Firestore | ✅ Yes | Campaign document |
| **Scene Images** | Replicate CDN | ❌ No (24h) | Temporary URL |
| **Scene Images** | Firestore | ✅ Yes | Campaign.storyboardImages (but URLs expire) |
| **Videos** | AWS S3 | ✅ Yes | S3 permanent URL |
| **Video Thumbnails** | AWS S3 | ✅ Yes | S3 permanent URL |
| **Video Metadata** | Firestore | ✅ Yes | Campaign.videos |

---

## Storage Architecture

### Current Implementation

```
┌─────────────────────────────────────────────────────────┐
│                      USER BROWSER                        │
│  ┌──────────────┐  ┌─────────────┐  ┌───────────────┐  │
│  │ localStorage │  │ React State │  │ Session Data  │  │
│  └──────────────┘  └─────────────┘  └───────────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │
                         │ Firebase SDK
                         ↓
┌─────────────────────────────────────────────────────────┐
│                     FIREBASE                             │
│  ┌──────────────┐  ┌─────────────┐  ┌───────────────┐  │
│  │  Firestore   │  │   Storage   │  │   Functions   │  │
│  │              │  │   (unused)  │  │               │  │
│  │ - Campaigns  │  │             │  │ - uploadToS3  │  │
│  │ - Users      │  │             │  │ - generateXXX │  │
│  └──────────────┘  └─────────────┘  └───────────────┘  │
└─────────┬──────────────────────────────────┬───────────┘
          │                                   │
          │                                   │ Axios HTTP
          │                                   ↓
          │                    ┌────────────────────────────┐
          │                    │      REPLICATE API         │
          │                    │ ┌────────────────────────┐ │
          │                    │ │  Nano Banana (images)  │ │
          │                    │ │  Seedance (videos)     │ │
          │                    │ └────────────────────────┘ │
          │                    └──────────────┬─────────────┘
          │                                   │
          │                                   │ Temporary URLs
          │                                   │ (24 hour expiry)
          │                                   ↓
          │                    ┌────────────────────────────┐
          │                    │    REPLICATE CDN           │
          │                    │  ┌──────────────────────┐  │
          │                    │  │  Scene Images (.png) │  │
          │                    │  │  Videos (.mp4)       │  │
          │                    │  │  Thumbnails (.jpg)   │  │
          │                    │  └──────────────────────┘  │
          │                    └────────────┬───────────────┘
          │                                 │
          │                                 │ Download & Upload
          │                                 │ (Firebase Function)
          │                                 ↓
          └────────────────────→ ┌────────────────────────────┐
                                 │        AWS S3              │
                                 │  ┌──────────────────────┐  │
                                 │  │ ✅ Videos (.mp4)     │  │
                                 │  │ ✅ Thumbnails (.jpg) │  │
                                 │  │ ⚠️ Images (.png)     │  │
                                 │  │    NOT UPLOADED YET  │  │
                                 │  └──────────────────────┘  │
                                 │  Permanent Storage         │
                                 │  AES256 Encryption         │
                                 └────────────────────────────┘
```

---

### Recommended Architecture (With Image Upload)

```javascript
// NEW FUNCTION NEEDED: uploadImageToS3

export const uploadImageToS3 = functions.https.onCall(async (data, context) => {
  const { imageUrl, campaignId, sceneId, sceneNumber } = data;
  const userId = context.auth.uid;

  // Download from Replicate
  const imageResponse = await axios.get(imageUrl, {
    responseType: 'arraybuffer'
  });
  const imageBuffer = Buffer.from(imageResponse.data);

  // Upload to S3
  const imageKey = `images/${userId}/${campaignId}/scene-${sceneNumber}.png`;
  await s3Client.send(new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: imageKey,
    Body: imageBuffer,
    ContentType: 'image/png',
    ServerSideEncryption: 'AES256'
  }));

  // Generate permanent URL
  const s3ImageUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${imageKey}`;

  return {
    success: true,
    imageUrl: s3ImageUrl,
    s3Key: imageKey
  };
});
```

---

## Cost Analysis

### Per Campaign Cost Breakdown

**Assumptions:**
- 7 scenes
- 2 video variations
- 7 seconds per video
- 1080p resolution
- seedance-1-lite model

| Service | Operation | Unit Cost | Quantity | Total |
|---------|-----------|-----------|----------|-------|
| **Replicate** | Scene images (Nano Banana) | Free (beta) | 7 images | $0.00 |
| **Replicate** | Video generation (Seedance Lite) | $0.072/sec | 2 videos × 7 sec | $1.008 |
| **OpenAI** | Concept generation (GPT-4) | ~$0.03 | 1 request | $0.03 |
| **OpenAI** | Scene prompts (GPT-4) | ~$0.05 | 1 request | $0.05 |
| **AWS S3** | Video storage | $0.023/GB/month | ~100MB | $0.002 |
| **AWS S3** | Data transfer out | $0.09/GB | ~100MB | $0.009 |
| **Firebase** | Firestore writes | Free tier | ~20 writes | $0.00 |
| **Firebase** | Functions invocations | Free tier | ~10 calls | $0.00 |
| **TOTAL** | | | | **~$1.10** |

### Scaling Costs

| Campaigns/Month | Total Cost | Per-User Cost (100 campaigns) |
|-----------------|------------|-------------------------------|
| 100 | $110 | $1.10 |
| 1,000 | $1,100 | $1.10 |
| 10,000 | $11,000 | $1.10 |

**Cost Optimization Tips:**
1. Use `seedance-1-lite` instead of `seedance-1-pro` (40% cheaper)
2. Reduce video duration (7s vs 10s = 30% savings)
3. Use 720p instead of 1080p (50% cheaper)
4. Implement CloudFront CDN (reduce S3 data transfer costs)
5. Add S3 lifecycle policy (delete videos after 90 days)

---

## API Reference

### Image Generation

**Endpoint:** `https://us-central1-vid-ad.cloudfunctions.net/generateScenes`

**Request:**
```json
{
  "formData": {
    "productName": "EcoBottle Pro",
    "productDescription": "Sustainable insulated water bottle",
    "keywords": ["sustainable", "eco-friendly"],
    "brandTone": "energetic",
    "primaryColor": "#FF6B6B",
    "targetAudience": "Health-conscious millennials",
    "orientation": "portrait",
    "duration": 7,
    "conceptTagline": "Adventure Awaits",
    "conceptNarrative": "Follow a day in the life...",
    "conceptVisualStyle": "Cinematic outdoor scenes..."
  },
  "numberOfScenes": 7
}
```

**Response:**
```json
{
  "success": true,
  "images": [
    {
      "id": "scene-1",
      "url": "https://replicate.delivery/pbxt/abc123/scene1.png",
      "prompt": "Cinematic sunrise on mountain peak...",
      "sceneNumber": 1,
      "description": "Epic sunrise moment",
      "cameraAngle": "Low angle, wide shot",
      "lighting": "Golden hour backlight",
      "mood": "Epic, inspirational"
    }
  ],
  "count": 7,
  "aiPowered": true,
  "enhancedWithFormData": true
}
```

---

### Video Upload to S3

**Endpoint:** Firebase Function `uploadVideoToS3`

**Request:**
```javascript
const uploadVideoFn = httpsCallable(functions, 'uploadVideoToS3');
await uploadVideoFn({
  videoUrl: "https://replicate.delivery/pbxt/xyz789/video.mp4",
  campaignId: "campaign_uuid",
  videoId: "abc123def456",
  thumbnailUrl: "https://replicate.delivery/pbxt/xyz789/thumb.jpg"
});
```

**Response:**
```json
{
  "success": true,
  "videoUrl": "https://vid-ad-videos.s3.us-east-2.amazonaws.com/videos/user123/campaign456/video789.mp4",
  "thumbnailUrl": "https://vid-ad-videos.s3.us-east-2.amazonaws.com/thumbnails/user123/campaign456/video789.jpg",
  "s3Key": "videos/user123/campaign456/video789.mp4"
}
```

---

## Summary

### What's Working ✅

1. **Image Generation:** Scene images generated via Replicate Nano Banana with AI-enhanced prompts
2. **Video Generation:** Videos generated via Replicate Seedance with customizable parameters
3. **Video Storage:** Videos and thumbnails uploaded to AWS S3 for permanent storage
4. **Form Integration:** All form inputs properly flow through to AI generation
5. **Cost Effective:** ~$1.10 per campaign with 7 scenes and 2 video variations

### What Needs Improvement ⚠️

1. **Image Storage:** Scene images need to be uploaded to S3 (currently expire after 24 hours)
2. **Logo Upload:** Not yet integrated into image/video generation
3. **Product Images:** Not yet integrated into image/video generation
4. **CloudFront CDN:** Should be configured for faster, cheaper delivery

### Recommendation: Add S3 Image Upload

**Priority:** HIGH
**Reason:** Scene images currently expire after 24 hours on Replicate CDN

**Implementation:**
1. Create `uploadImageToS3` Firebase Function
2. Call after each scene image generation
3. Update Firestore with permanent S3 URLs
4. Add to storage architecture: `s3://vid-ad-videos/images/${userId}/${campaignId}/scene-${n}.png`

---

**Last Updated:** 2025-11-07
**Version:** 1.0
**Author:** System Documentation

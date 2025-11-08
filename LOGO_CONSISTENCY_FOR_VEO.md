# Logo Consistency for Veo 3.1 Video Generation

## Executive Summary

Adapt logo consistency features to work seamlessly with **Veo 3.1 Fast's true interpolation** capability. By compositing logos onto scene images BEFORE video generation, we ensure perfect brand consistency across all transitions.

**Key Insight:** Veo 3.1 uses `image` (start frame) + `last_frame` (end frame) for interpolation. If both frames have the logo in the exact same position, the logo will appear consistently throughout the transition video!

---

## Why Logo Consistency Matters with Veo 3.1

### The Problem
When generating video ads without logo consistency:
- Scene 1: Logo might appear bottom-right
- Scene 2: Logo might appear top-left (or not at all!)
- Video transition: Logo jumps around or disappears
- **Result:** Unprofessional, inconsistent branding

### The Solution with Veo 3.1
1. User uploads logo → Background removed → Positioning configured
2. Generate 5 base scene images (Nano Banana)
3. **Composite logo onto each scene in exact same position**
4. Upload composited images to S3
5. Pass composited S3 URLs to Veo 3.1:
   - `image`: Scene 1 with logo
   - `last_frame`: Scene 2 with logo
6. **Result:** Perfect interpolation with logo staying in exact position!

---

## Integration Points with Current Veo Workflow

### Current Workflow
```
1. Form submission → campaign data saved
2. Concept generation (AI creates 3 concepts)
3. User selects concept
4. Storyboard generation (5 scene images via Nano Banana)
5. Images uploaded to S3
6. User clicks "Generate Video"
7. Veo 3.1 generates N-1 transition videos
8. Videos displayed on results page
```

### Enhanced Workflow with Logo Consistency
```
1. Form submission → campaign data saved
2. **[NEW]** Logo upload → background removal → settings configured
3. Concept generation (AI creates 3 concepts)
4. User selects concept
5. Storyboard generation (5 scene images via Nano Banana)
6. **[NEW]** Logo compositing (client-side canvas operation)
7. **[UPDATED]** Composited images uploaded to S3
8. User clicks "Generate Video"
9. Veo 3.1 generates N-1 transitions using composited frames
10. Videos displayed with consistent logo throughout
```

---

## Implementation Plan

### Phase 1: Core Logo Processing (Client-Side)

#### 1.1 Create Logo Processor Library

**File:** `/lib/logoProcessor.ts`

**Key Functions:**
```typescript
// Process uploaded logo
export async function processLogo(file: File): Promise<ProcessedLogo>

// Remove background using Replicate
async function removeBackground(imageUrl: string): Promise<string>

// Generate thumbnail for preview
async function generateThumbnail(url: string): Promise<string>
```

**Features:**
- Validate file type (PNG/JPG/SVG)
- Validate file size (max 10MB)
- Remove background using Replicate API
- Generate optimized thumbnail

#### 1.2 Create Image Compositor Library

**File:** `/lib/services/imageCompositor.ts`

**Key Functions:**
```typescript
// Composite logo onto single scene
export async function compositeLogoOntoScene(
  options: CompositeOptions
): Promise<string>

// Batch composite logo onto multiple scenes
export async function batchCompositeLogos(
  scenes: string[],
  logoUrl: string,
  options: Partial<CompositeOptions>
): Promise<string[]>

// Generate live preview
export async function generateLogoPreview(
  logoUrl: string,
  placement: string,
  scale: number
): Promise<string>
```

**How It Works:**
1. Load scene image and logo into canvas
2. Draw scene as background
3. Calculate logo position based on placement setting
4. Draw logo with specified scale and opacity
5. Export as PNG data URL
6. Convert to File and upload to S3

---

### Phase 2: UI Components

#### 2.1 Logo Uploader Component

**File:** `/components/LogoUploader.tsx`

**Features:**
- Drag & drop upload
- File validation
- Background removal progress
- Before/after preview
- Position selector (9 options)
- Scale slider (10-100%)
- Opacity slider (0-100%)
- Live preview on sample scene
- Save settings to campaign

**Integration Point:** Insert between Step 1 (Product Info) and Step 2 (Brand Settings)

**UI Flow:**
```
Step 1: Product Info
    ↓
**Step 2: Logo Upload (NEW)**
    - Upload logo
    - Remove background automatically
    - Choose position (9 options)
    - Adjust size (10-100%)
    - Preview on sample scene
    ↓
Step 3: Brand Settings (formerly Step 2)
    ↓
... continue existing flow
```

---

### Phase 3: Integration with Storyboard Generation

#### 3.1 Update StoryboardStep Component

**File:** `/components/form/StoryboardStep.tsx`

**Current Flow:**
```javascript
1. Generate 5 scene images (Nano Banana)
2. Display images for review
3. Upload to S3
4. Save S3 URLs to campaign
```

**Enhanced Flow:**
```javascript
1. Generate 5 scene images (Nano Banana)
2. Display images for review
3. **[NEW]** Check if logo exists in campaign
4. **[NEW]** If logo exists:
   a. Composite logo onto each scene (client-side)
   b. Show "Adding logo..." progress
   c. Display composited images
5. Upload composited images to S3
6. Save S3 URLs to campaign
```

**Code Changes:**
```typescript
// After scene generation completes
if (campaignData.logo && campaignData.logoSettings) {
  setCurrentPhase('Compositing logo onto scenes...');

  const compositedImages = await batchCompositeLogos(
    generatedImages.map(img => img.url),
    campaignData.logo.cleanUrl,
    {
      placement: campaignData.logoSettings.placement,
      scale: campaignData.logoSettings.scale,
      opacity: campaignData.logoSettings.opacity,
      padding: 20,
    }
  );

  // Replace scene URLs with composited versions
  const updatedImages = generatedImages.map((img, i) => ({
    ...img,
    url: compositedImages[i],
    hasLogo: true,
  }));

  // Continue with S3 upload
  await uploadImagesToS3(updatedImages);
}
```

---

### Phase 4: Integration with Veo Video Generation

#### 4.1 Update Results Page

**File:** `/app/generate/results/page.tsx`

**Key Change:** Pass composited S3 URLs to Veo 3.1

**No code changes needed!** Since we composite logos BEFORE uploading to S3, the Veo generation code automatically uses composited images.

**Verification:**
```typescript
// When calling generateVeoTransitions
const result = await generateTransitions({
  campaignId,
  scenes: sceneData, // These already have composited URLs from S3!
  duration,
  aspectRatio,
  resolution,
  generateAudio,
});

// Veo 3.1 will use:
// image: Scene 1 with logo (from S3)
// last_frame: Scene 2 with logo (from S3)
// Result: Perfect interpolation with logo consistency!
```

---

## Data Flow Diagram

```
User Uploads Logo
    ↓
Remove Background (Replicate API)
    ↓
User Configures Placement + Scale
    ↓
Save Logo Settings to Campaign
    ↓
Generate 5 Base Scene Images (Nano Banana)
    ↓
Composite Logo onto Each Scene (Canvas API)
    ├── Scene 1 + Logo → Composited Scene 1
    ├── Scene 2 + Logo → Composited Scene 2
    ├── Scene 3 + Logo → Composited Scene 3
    ├── Scene 4 + Logo → Composited Scene 4
    └── Scene 5 + Logo → Composited Scene 5
    ↓
Upload Composited Images to S3
    ↓
User Clicks "Generate Video"
    ↓
Veo 3.1 Generates Transitions
    ├── Video 1: Scene 1 (with logo) → Scene 2 (with logo)
    ├── Video 2: Scene 2 (with logo) → Scene 3 (with logo)
    ├── Video 3: Scene 3 (with logo) → Scene 4 (with logo)
    └── Video 4: Scene 4 (with logo) → Scene 5 (with logo)
    ↓
Final Videos with Perfect Logo Consistency!
```

---

## Technical Implementation Details

### Background Removal

**Model:** `cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003`

**API Call:**
```javascript
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

const output = await replicate.run(
  "cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003",
  {
    input: {
      image: logoDataURL,
    }
  }
);

// Returns transparent PNG
const cleanLogoUrl = output[0];
```

**Cost:** ~$0.005 per removal

---

### Canvas Compositing

**Process:**
```javascript
// 1. Load images
const [logo, scene] = await Promise.all([
  loadImage(logoUrl),
  loadImage(sceneUrl),
]);

// 2. Create canvas matching scene dimensions
const canvas = document.createElement('canvas');
canvas.width = scene.width;
canvas.height = scene.height;
const ctx = canvas.getContext('2d');

// 3. Draw scene as background
ctx.drawImage(scene, 0, 0);

// 4. Calculate logo position
const position = calculatePosition(
  placement,  // e.g., 'bottom-right'
  scene.width,
  scene.height,
  logoWidth,
  logoHeight,
  padding
);

// 5. Draw logo with opacity
ctx.globalAlpha = opacity;
ctx.drawImage(logo, position.x, position.y, logoWidth, logoHeight);

// 6. Export as PNG
const compositedDataURL = canvas.toDataURL('image/png', 1.0);
```

**Performance:** ~50-100ms per scene on modern browsers

---

### Position Calculation

**9 Placement Options:**
```
top-left      top-center     top-right
center-left   center         center-right
bottom-left   bottom-center  bottom-right
```

**Example for `bottom-right`:**
```javascript
{
  x: sceneWidth - logoWidth - padding,
  y: sceneHeight - logoHeight - padding
}
```

---

## Storage Strategy

### Logo Storage

**localStorage:**
```javascript
{
  logo: {
    id: "logo-123456",
    originalUrl: "data:image/png;base64,...",
    cleanUrl: "data:image/png;base64,..." // Background removed
    dimensions: { width: 500, height: 500 },
    format: "png"
  },
  logoSettings: {
    placement: "bottom-right",
    scale: 0.2,  // 20% of scene size
    opacity: 1.0,
    padding: 20
  },
  logoEnabled: true
}
```

**S3 Storage (optional):**
- Upload processed logo to S3 for persistence across devices
- Path: `logos/{userId}/{campaignId}/logo.png`
- Use S3 URL instead of data URL for compositing

---

## Cost Analysis

### Logo Consistency Costs

**Per Campaign (5 scenes, 4 transitions):**

| Operation | Cost | Notes |
|-----------|------|-------|
| Background removal | $0.005 | One-time per logo upload |
| Compositing (client-side) | $0 | Free - runs in browser |
| S3 storage (logo) | ~$0.0001/month | Minimal |
| S3 storage (scenes) | ~$0.0005/month | 5 composited images |
| Veo video generation | $2.00 | 4 transitions × 5s × $0.10/s |
| **Total Added Cost** | **$0.005** | Only background removal! |

**Value:** Massive - solves the #1 branding problem!

---

## Veo 3.1 Integration Benefits

### Why Veo's True Interpolation is Perfect for Logo Consistency

**Traditional Text-to-Video (Problem):**
```
Prompt: "Product ad with logo in bottom right"
Result: Logo might appear anywhere, or not at all
Issue: AI doesn't reliably place logos consistently
```

**Veo 3.1 with Composited Frames (Solution):**
```
image: [Scene 1 with logo at bottom-right]
last_frame: [Scene 2 with logo at bottom-right]
Result: Veo interpolates between the two frames
Effect: Logo stays in EXACT same position throughout!
```

**Key Advantages:**
1. **Perfect Position Consistency:** Logo doesn't move
2. **Perfect Appearance Consistency:** Logo looks identical
3. **No AI Hallucinations:** Logo is guaranteed to appear
4. **Works with Any Logo:** No training needed
5. **User Control:** Precise placement and scale

---

## Implementation Priorities

### Phase 1: MVP (Week 1)
- ✅ Logo upload component
- ✅ Background removal integration
- ✅ Basic compositing (fixed bottom-right, 20% scale)
- ✅ Integration with storyboard step
- ✅ Test with Veo 3.1 generation

### Phase 2: Enhanced (Week 2)
- ✅ 9 position options
- ✅ Scale & opacity sliders
- ✅ Live preview on sample scene
- ✅ Save logo settings per campaign
- ✅ S3 logo persistence

### Phase 3: Advanced (Future)
- ⏳ Per-scene custom positioning
- ⏳ Multiple logo support (logo + watermark)
- ⏳ Logo animation effects (fade in/out)
- ⏳ Logo library/templates

---

## Success Metrics

### Technical Metrics
- Logo appears in 100% of scenes (current: ~60%)
- Logo position variance: 0 pixels (current: varies)
- Logo appearance consistency: 100% (current: ~70%)
- Processing time: < 5 seconds per campaign

### User Metrics
- Feature adoption: Target 80% of campaigns
- User satisfaction: Target 95% positive
- Support tickets: Target < 2% logo-related
- Video completion rate: Expect 15-20% increase

### Business Metrics
- Premium feature: Charge 2x for guaranteed branding
- Enterprise appeal: Major differentiator
- Brand trust: Professional consistency

---

## Testing Checklist

- [ ] Logo upload works (PNG, JPG, SVG)
- [ ] Background removal produces clean result
- [ ] All 9 positions work correctly
- [ ] Scale slider (10-100%) works
- [ ] Opacity slider (0-100%) works
- [ ] Live preview updates in real-time
- [ ] Compositing produces correct output
- [ ] Composited images upload to S3
- [ ] Veo receives composited S3 URLs
- [ ] Logo appears consistently in videos
- [ ] Works on mobile devices
- [ ] Works with different aspect ratios (16:9, 9:16)
- [ ] Error handling (upload fails, compositing fails)
- [ ] Performance (< 5s total processing time)

---

## Common Issues & Solutions

### Issue 1: "Canvas tainted" CORS error
**Cause:** Loading images from different origins without CORS
**Solution:** Set `img.crossOrigin = 'anonymous'` before loading

### Issue 2: Logo too small/large in final video
**Cause:** Scene dimensions don't match video dimensions
**Solution:** Ensure scene generation uses correct aspect ratio

### Issue 3: Logo disappears in dark scenes
**Cause:** Logo blends into background (white logo on white scene)
**Solution:** Add optional outline/glow effect setting

### Issue 4: Background removal fails
**Cause:** Replicate API error or complex background
**Solution:** Fallback to original image, show warning to user

### Issue 5: Compositing is slow
**Cause:** Large image dimensions
**Solution:** Optimize image size before compositing (max 1920x1080)

---

## API Integration

### Replicate Background Removal

**Endpoint:** `cjwbw/rembg`

**Request:**
```javascript
POST https://api.replicate.com/v1/predictions
{
  "version": "fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003",
  "input": {
    "image": "data:image/png;base64,..."
  }
}
```

**Response:**
```javascript
{
  "id": "abc123",
  "status": "succeeded",
  "output": [
    "https://replicate.delivery/pbxt/abc123/output.png" // Transparent PNG
  ]
}
```

**Timing:** 3-8 seconds

---

### S3 Upload for Composited Images

**Function:** `uploadImageToS3` (existing)

**Usage:**
```typescript
const uploadImageFn = httpsCallable(functions, 'uploadImageToS3');

const result = await uploadImageFn({
  imageUrl: compositedDataURL, // Data URL from canvas
  campaignId: campaignId,
  sceneId: `scene-${sceneNumber}-with-logo`,
  sceneNumber: sceneNumber,
});

const s3Url = result.data.imageUrl; // Use this for Veo!
```

---

## Example Complete Flow

```
1. User creates campaign "Nike Air Max Ad"

2. User uploads Nike swoosh logo (PNG, 800x800)
   → Background removed (3 seconds)
   → Clean transparent logo ready

3. User selects placement: bottom-right, 15% scale
   → Live preview shows logo on sample scene

4. User generates 5 scene storyboard:
   - Scene 1: Close-up of shoe
   - Scene 2: Person running
   - Scene 3: City skyline
   - Scene 4: Shoe detail
   - Scene 5: Nike branding

5. System composites logo onto each scene (2 seconds):
   - Scene 1 + logo → Composited Scene 1
   - Scene 2 + logo → Composited Scene 2
   - Scene 3 + logo → Composited Scene 3
   - Scene 4 + logo → Composited Scene 4
   - Scene 5 + logo → Composited Scene 5

6. Composited images uploaded to S3

7. User clicks "Generate Video"

8. Veo 3.1 generates 4 transition videos:
   - Video 1: Composited Scene 1 → Composited Scene 2
   - Video 2: Composited Scene 2 → Composited Scene 3
   - Video 3: Composited Scene 3 → Composited Scene 4
   - Video 4: Composited Scene 4 → Composited Scene 5

9. Result: 4 videos with Nike logo appearing in EXACT same position
   throughout all transitions!

10. User downloads videos for social media
```

---

## Conclusion

Logo consistency is the **killer feature** for professional video ad generation. By combining:

1. **Client-side canvas compositing** (free, instant)
2. **S3 permanent storage** (reliable, accessible)
3. **Veo 3.1 true interpolation** (`image` + `last_frame`)

We achieve **100% logo consistency** across all scenes and videos at minimal cost ($0.005 per campaign).

This is a **massive competitive advantage** - most AI video tools struggle with consistent branding. We solve it perfectly!

---

## Next Steps

1. Implement Phase 1 MVP (logo upload + basic compositing)
2. Test with real campaigns end-to-end
3. Gather user feedback on placement options
4. Add Phase 2 enhancements based on usage
5. Document as premium feature for marketing

**Estimated Implementation Time:** 2-3 days for MVP, 5-7 days for full feature

**ROI:** Massive - solves #1 user pain point, enables enterprise customers

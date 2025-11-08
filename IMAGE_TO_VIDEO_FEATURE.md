# Image-to-Video Feature

## Overview
Simple, standalone image-to-video generation using Kling 2.5 Turbo Pro. Users can upload a single image and generate a dynamic video with AI-powered motion.

## Files Created/Modified

### Backend (Firebase Functions)
1. **`/functions/src/imageToVideo.ts`** (NEW)
   - `generateImageToVideo` - Initiates video generation from image + prompt
   - `checkImageToVideoStatus` - Polls Replicate for completion status
   - Uses Kling 2.5 Turbo Pro model
   - Stores generation data in Firestore collection: `imageToVideoGenerations`

2. **`/functions/src/index.ts`** (UPDATED)
   - Added export for `imageToVideo` module

### Frontend (Next.js)
3. **`/app/image-to-video/page.tsx`** (NEW)
   - Full-featured image-to-video UI
   - Drag & drop image upload
   - Prompt and negative prompt inputs
   - Duration selector (5s or 10s)
   - Real-time status polling
   - Video preview and download

4. **`/app/page.tsx`** (UPDATED)
   - Added "Image to Video" button on home page

## Key Features

### User Experience
- ✅ **Simple Workflow**: Upload → Describe Motion → Generate
- ✅ **Drag & Drop**: Easy image upload
- ✅ **Real-time Progress**: Status updates during generation
- ✅ **Video Preview**: Inline video player with download option
- ✅ **Cost Transparency**: Shows $0.07/second pricing

### Technical Implementation
- **Model**: Kling 2.5 Turbo Pro (`kwaivgi/kling-v2.5-turbo-pro`)
- **Input Parameters**:
  - `start_image` - Source image URL (from S3)
  - `prompt` - Motion description
  - `negative_prompt` - Things to avoid (optional)
  - `duration` - 5 or 10 seconds
  - `aspect_ratio` - Ignored when `start_image` is provided (uses image aspect ratio)

- **Polling Strategy**:
  - Check status every 5 seconds
  - Max 60 attempts (5 minutes timeout)
  - Updates Firestore with latest status/output

### Data Flow
```
1. User uploads image → Client
2. Upload to S3 → Get URL
3. Call generateImageToVideo → Firebase Function
4. Create Replicate prediction → Store in Firestore
5. Poll checkImageToVideoStatus → Update UI
6. Video ready → Display & allow download
```

## Firestore Schema

### Collection: `imageToVideoGenerations`
```typescript
{
  id: string,
  userId: string,
  predictionId: string,         // Replicate prediction ID
  model: 'kwaivgi/kling-v2.5-turbo-pro',
  status: 'starting' | 'processing' | 'succeeded' | 'failed',
  type: 'image-to-video',
  input: {
    imageUrl: string,
    prompt: string,
    negativePrompt: string | null,
    duration: number,
    aspectRatio: string,
  },
  output: string | null,        // Video URL when complete
  error: string | null,
  logs: string | null,
  metrics: object | null,
  createdAt: timestamp,
  updatedAt: timestamp,
}
```

## Pricing

**Kling 2.5 Turbo Pro**: $0.07 per second
- 5-second video: **$0.35**
- 10-second video: **$0.70**

## User Guide

### How to Use
1. **Upload Image**: Drag & drop or click to upload any image
2. **Describe Motion**: Write a prompt describing how the image should animate
   - Example: "Camera slowly zooms in while the woman smiles and waves"
3. **Negative Prompt** (Optional): Specify what to avoid
   - Example: "blurry, distorted, low quality"
4. **Select Duration**: Choose 5 or 10 seconds
5. **Generate**: Click button and wait 2-3 minutes
6. **Download**: Video ready for download

### Example Prompts

**Portrait Animation**:
```
"Camera slowly zooms in, subject smiles and looks around.
Soft cinematic lighting, smooth motion, professional quality"
```

**Product Showcase**:
```
"Camera orbits around the product, dramatic lighting reveals details.
Slow motion, elegant movement, luxury aesthetic"
```

**Landscape Motion**:
```
"Camera pans left to right revealing the landscape.
Golden hour lighting, clouds moving slowly, peaceful atmosphere"
```

## API Integration

### Generate Video
```typescript
import { httpsCallable } from 'firebase/functions';

const generateFn = httpsCallable(functions, 'generateImageToVideo');
const result = await generateFn({
  imageUrl: 'https://s3.amazonaws.com/...',
  prompt: 'Camera zooms in slowly',
  negativePrompt: 'blurry, distorted',
  duration: 5,
  aspectRatio: '9:16',
});

console.log(result.data.videoId); // Use for status checking
```

### Check Status
```typescript
const checkFn = httpsCallable(functions, 'checkImageToVideoStatus');
const status = await checkFn({ videoId });

if (status.data.status === 'succeeded') {
  console.log('Video URL:', status.data.output);
}
```

## Future Enhancements

### Potential Features
- [ ] Multiple duration options (2-12 seconds)
- [ ] Aspect ratio selector (16:9, 9:16, 1:1)
- [ ] Camera movement presets (zoom, pan, orbit)
- [ ] Style transfer options
- [ ] Batch processing (multiple images)
- [ ] Integration with main ad generation workflow
- [ ] User gallery of generated videos
- [ ] Share/embed options

### Integration Ideas
- Add as optional step in main ad generation form
- Allow logo overlay on image before generation
- Connect to campaign system for organized storage
- Add to user dashboard with generation history

## Deployment

```bash
# Deploy image-to-video functions and hosting
firebase deploy --only functions:generateImageToVideo,functions:checkImageToVideoStatus,hosting
```

## Monitoring

### Firebase Console
- **Firestore**: Monitor `imageToVideoGenerations` collection
- **Functions**: Check logs for `generateImageToVideo` and `checkImageToVideoStatus`
- **Metrics**: Track invocation count, execution time, errors

### Replicate Dashboard
- Monitor API usage and costs
- Track prediction success/failure rates
- View model performance metrics

## Troubleshooting

### Common Issues

**Image Upload Fails**:
- Check S3 credentials in environment
- Verify image file size (<10MB)
- Ensure valid image format (PNG, JPG, WEBP)

**Video Generation Stalls**:
- Check Replicate API key is valid
- Monitor prediction status in Replicate dashboard
- Check Firebase Function logs for errors

**Status Polling Timeout**:
- Increase maxAttempts in polling logic
- Check if Replicate service is experiencing delays
- Verify Firestore write permissions

## Support

For issues or questions:
1. Check Firebase Functions logs
2. Review Replicate prediction details
3. Verify API keys are configured
4. Check network connectivity to S3 and Replicate

---

**Status**: ✅ Deployed to production
**URL**: https://vid-ad.web.app/image-to-video
**Last Updated**: 2025-01-07

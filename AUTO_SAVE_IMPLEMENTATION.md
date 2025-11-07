# Auto-Save and S3 Upload Implementation

## Overview
This document details the implementation of automatic campaign saving throughout the form flow and S3 upload for scene images.

## Changes Implemented

### 1. Automatic Campaign Creation and Saving (`app/generate/page.tsx`)

#### Campaign Initialization
- **Campaign created immediately** when user visits `/generate` page
- Campaign ID stored in `localStorage` as `activeCampaignId`
- Initial campaign saved to Firestore with status `draft`

#### Auto-Save on Form Changes
- Form data automatically saved to localStorage on every change
- Form data saved to Firestore every 2 seconds (debounced)
- Campaign status tracked throughout the flow:
  - `draft` - User filling out form
  - `generating` - Video generation in progress (when user clicks "Generate Video")
  - `completed` - Videos finished generating
  - `failed` - Generation failed

#### Step Progress Tracking
- Current step number saved with campaign data
- Allows users to resume exactly where they left off
- Step changes trigger immediate Firestore update

### 2. Form Step Change Tracking (`components/AdGenerationForm.tsx`)

#### New Props Added
```typescript
interface AdGenerationFormProps {
  campaignId?: string;
  onStepChange?: (step: number, formData: AdGenerationFormData) => void;
}
```

#### Step Change Callbacks
- `handleNext()` - Notifies parent when moving to next step
- `handlePrevious()` - Notifies parent when going back
- `handleStepClick()` - Notifies parent when clicking step indicator

Each callback triggers:
1. Form data validation (if moving forward)
2. Campaign save to Firestore with current step number
3. UI update to show new step

### 3. S3 Image Upload Implementation

#### New Firebase Function (`functions/src/s3Upload.ts`)

```typescript
export const uploadImageToS3 = functions.https.onCall(async (data, context) => {
  // Downloads image from Replicate CDN
  // Uploads to S3 with encryption
  // Returns permanent S3 URL
});
```

**Function Features:**
- Downloads images from temporary Replicate URLs (24-hour expiration)
- Uploads to S3 with AES256 server-side encryption
- Organizes images: `scenes/{userId}/{campaignId}/scene-{sceneNumber}.jpg`
- Returns permanent S3 or CloudFront URLs
- Includes metadata: userId, campaignId, sceneId, sceneNumber, uploadedAt

#### StoryboardStep Integration (`components/form/StoryboardStep.tsx`)

**Auto-Upload After Generation:**
```typescript
const generateStoryboard = async () => {
  // 1. Generate scenes via generateScenes Cloud Function
  // 2. Upload each scene image to S3
  // 3. Replace temporary URLs with permanent S3 URLs
  // 4. Update state with permanent URLs
};
```

**Auto-Upload After Regeneration:**
```typescript
const regenerateScene = async (sceneNumber: number) => {
  // 1. Regenerate scene via regenerateScene Cloud Function
  // 2. Upload new scene image to S3
  // 3. Replace temporary URL with permanent S3 URL
  // 4. Update state with permanent URL
};
```

## Data Flow

### Campaign Creation Flow
```
User visits /generate
  ↓
Generate campaign ID (UUID)
  ↓
Save to localStorage (activeCampaignId)
  ↓
Create campaign in Firestore (status: draft, currentStep: 1)
  ↓
Load existing draft data (if any)
```

### Form Progress Auto-Save Flow
```
User changes form field
  ↓
Save to localStorage immediately
  ↓
Debounce 2 seconds
  ↓
Update campaign in Firestore
  ↓
Include: all form data + currentStep + status: draft
```

### Step Change Flow
```
User clicks Next/Previous/Step
  ↓
Validate form (if needed)
  ↓
Update currentStep state
  ↓
Trigger onStepChange callback
  ↓
Save to Firestore: formData + currentStep + status: draft
```

### Scene Image Upload Flow
```
Generate scenes via Cloud Function
  ↓
Receive temporary Replicate URLs (24hr expiration)
  ↓
For each image:
  ├─ Download from Replicate
  ├─ Upload to S3 with encryption
  └─ Get permanent S3/CloudFront URL
  ↓
Replace temporary URLs with permanent URLs
  ↓
Store permanent URLs in campaign data
```

### Final Submission Flow
```
User clicks "Generate Video"
  ↓
Update campaign status to "generating"
  ↓
Save final data to Firestore
  ↓
Clear draft and activeCampaignId
  ↓
Redirect to /generate/results
```

## Benefits

### For Users
1. **Never lose progress** - All form data automatically saved
2. **Resume anytime** - Can close browser and come back later
3. **Permanent images** - Scene images stored permanently in S3
4. **Dashboard visibility** - All campaigns (draft, generating, completed) appear in dashboard

### For System
1. **Data persistence** - Campaign data stored in Firestore, not just localStorage
2. **Image reliability** - No 24-hour expiration on scene images
3. **Better UX** - Users can see drafts in dashboard and continue later
4. **Scalability** - S3 storage is more reliable than Replicate CDN links

## Storage Structure

### Firestore
```
campaigns/{campaignId}
  ├─ userId: string
  ├─ status: "draft" | "generating" | "completed" | "failed"
  ├─ currentStep: number (1-7)
  ├─ productName: string
  ├─ productDescription: string
  ├─ ... (all form fields)
  ├─ selectedConcept: object
  ├─ storyboardImages: array
  ├─ createdAt: timestamp
  └─ updatedAt: timestamp
```

### AWS S3
```
vid-ad-bucket/
├─ scenes/
│  └─ {userId}/
│     └─ {campaignId}/
│        ├─ scene-1.jpg
│        ├─ scene-2.jpg
│        └─ scene-N.jpg
├─ videos/
│  └─ {userId}/
│     └─ {campaignId}/
│        └─ {videoId}.mp4
└─ thumbnails/
   └─ {userId}/
      └─ {campaignId}/
         └─ {videoId}.jpg
```

### localStorage (for quick access)
```javascript
{
  "activeCampaignId": "uuid-string",
  "adGenerationDraft": {
    // All form field data
  },
  "campaign_{campaignId}": {
    // Full campaign data snapshot
  }
}
```

## Testing Checklist

- [x] Campaign created on page load
- [x] Campaign saved to Firestore immediately
- [x] Form changes auto-save to localStorage
- [x] Form changes debounce and save to Firestore
- [x] Step changes tracked and saved
- [x] Scene images uploaded to S3 after generation
- [x] Regenerated scenes uploaded to S3
- [x] Permanent S3 URLs stored in campaign
- [ ] Dashboard shows draft campaigns
- [ ] Dashboard shows generating campaigns
- [ ] Dashboard shows completed campaigns
- [ ] Can resume draft from dashboard
- [ ] Images accessible from S3 after 24 hours

## Known Issues

1. **Authentication bypass** - Currently using `const user = true` for testing. Need to enable full auth.
2. **Error handling** - S3 upload failures fall back to Replicate URLs (which expire in 24hrs)
3. **Concurrent saves** - Multiple rapid form changes might cause race conditions in Firestore

## Future Improvements

1. **Optimistic UI** - Show saved indicator when Firestore save completes
2. **Retry logic** - Retry failed S3 uploads automatically
3. **Progress indicator** - Show "Uploading images to S3..." progress
4. **Cleanup** - Delete old draft campaigns after X days
5. **Conflict resolution** - Handle multiple devices editing same campaign

# PR#01: Post-Generation Voiceover Workflow with Replicate Voice Integration

**Estimated Time:** 25-35 hours  
**Complexity:** HIGH  
**Dependencies:** None (can be developed independently)

---

## Overview

### What We're Building
A post-generation voiceover workflow that allows users to add professional voiceovers to completed videos. Users can choose from Replicate's default voices or clone their own voice with custom names. The workflow includes optional AI script generation with viral hooks and a streamlined 4-step process.

### Why It Matters
- Enhances video quality with professional narration
- Provides flexibility (users decide after seeing video)
- Enables brand voice consistency through cloning
- Streamlined UX reduces friction
- Leverages existing Replicate infrastructure (no new API keys)

### Success in One Sentence
"This PR is successful when users can seamlessly add voiceovers to any completed video using Replicate voices or their own cloned voices, with an intuitive 4-step workflow."

---

## Technical Design

### Architecture Decisions

#### Decision 1: Post-Generation vs Pre-Generation
**Options Considered:**
1. Pre-generation - Add voiceover during initial video creation
2. Post-generation - Add voiceover after video is complete (chosen)

**Chosen:** Post-generation workflow

**Rationale:**
- Users can review video first, then decide if voiceover is needed
- Reduces complexity of initial generation flow
- Allows users to test multiple voice options on same video
- Better UX - users see what they're enhancing

**Trade-offs:**
- Gain: Simpler initial flow, user choice, flexibility
- Lose: Additional step for users who always want voiceover

#### Decision 2: Replicate vs 11 Labs
**Options Considered:**
1. 11 Labs - Dedicated voice service
2. Replicate - Existing infrastructure (chosen)

**Chosen:** Replicate API

**Rationale:**
- Already integrated in project
- No additional API keys needed
- Multiple voice models available
- Cost-effective (single provider)
- Voice cloning supported via Replicate models

**Trade-offs:**
- Gain: Simplicity, cost efficiency, existing setup
- Lose: Potentially less specialized than 11 Labs

#### Decision 3: Voice Clone Storage
**Options Considered:**
1. Single clone per user
2. Multiple named clones per user (chosen)

**Chosen:** Multiple named clones

**Rationale:**
- Users may want different voices for different brands/projects
- Better organization and management
- More flexible for power users

**Trade-offs:**
- Gain: Flexibility, organization, scalability
- Lose: Slightly more complex storage schema

### Data Model

**New Collections:**
```
users/{userId}/clonedVoices/{voiceName}/
├── voiceName: string (unique per user)
├── replicateVoiceId: string
├── replicateModel: string (e.g., "minimax/voice-cloning")
├── audioUrl: string (original sample)
├── createdAt: timestamp
├── usageCount: number
└── lastUsed: timestamp
```

**Schema Changes:**
```typescript
// Video documents - add voiceover fields
{
  // ... existing fields ...
  hasVoiceover: boolean,
  voiceoverUrl?: string,
  voiceoverProvider?: 'openai' | 'replicate',
  voiceType?: 'default' | 'cloned',
  voiceId?: string,
  clonedVoiceName?: string,
  script?: string,
  composedVideoUrl?: string
}
```

### API Design

**New Firebase Functions:**
```typescript
// functions/src/replicateVoice.ts

// Discover available voice models
discoverReplicateVoiceModels(): Promise<VoiceModel[]>

// Get default voices from Replicate
getReplicateDefaultVoices(): Promise<Voice[]>

// Generate voiceover
generateReplicateVoiceover({
  text: string,
  voiceType: 'default' | 'cloned',
  voiceId: string,
  speed?: number
}): Promise<{ audioUrl: string, duration: number }>

// Clone voice from audio
cloneVoice({
  audioFile: File,
  voiceName: string,
  userId: string
}): Promise<{ voiceId: string, voiceName: string }>

// Get user's cloned voices
getUserClonedVoices(userId: string): Promise<ClonedVoice[]>

// Delete cloned voice
deleteClonedVoice({
  userId: string,
  voiceName: string
}): Promise<void>

// Rename cloned voice
renameClonedVoice({
  userId: string,
  oldName: string,
  newName: string
}): Promise<void>
```

### Component Hierarchy
```
app/generate/voiceover/[videoId]/
├── VoiceoverWorkflow (wrapper with progress)
│   ├── VoiceSelectionStep
│   │   ├── DefaultVoiceBrowser
│   │   ├── ClonedVoiceSelector
│   │   └── VoiceCloneUpload
│   ├── ScriptInputStep
│   │   ├── ScriptGenerator (viral hooks)
│   │   ├── ScriptEditor
│   │   └── CustomScriptInput
│   ├── VoicePreviewStep
│   │   ├── VoicePreviewPlayer
│   │   └── VoiceSettings
│   └── CompositionStep
│       ├── VideoPreview
│       └── CompositionControls
```

---

## Implementation Details

### File Structure
**New Files:**
```
functions/src/replicateVoice.ts (~400 lines)
app/generate/voiceover/[videoId]/page.tsx (~300 lines)
components/voiceover/VoiceSelectionStep.tsx (~250 lines)
components/voiceover/ScriptInputStep.tsx (~200 lines)
components/voiceover/VoicePreviewStep.tsx (~150 lines)
components/voiceover/CompositionStep.tsx (~200 lines)
components/voiceover/VoiceoverWorkflow.tsx (~100 lines)
lib/services/voiceoverService.ts (~200 lines)
app/dashboard/voices/page.tsx (~200 lines)
```

**Modified Files:**
- `functions/src/prompts.ts` (+150 lines) - Add viral hooks
- `functions/src/openai.ts` (+100 lines) - Enhance script generation
- `functions/src/video.ts` (+200 lines) - Add composition function
- `app/generate/results/page.tsx` (+50 lines) - Add "Add Voiceover" buttons

### Key Implementation Steps

#### Phase 1: Replicate Voice Integration (8-10 hours)
1. Research Replicate voice models via API
2. Create `replicateVoice.ts` service
3. Implement voice discovery and listing
4. Implement voice cloning workflow
5. Implement voiceover generation
6. Create Firebase Cloud Functions
7. Test voice operations

#### Phase 2: UI Components (10-12 hours)
1. Create voiceover workflow page structure
2. Build voice selection step (default + clone)
3. Build script input step (AI generation + custom)
4. Build voice preview step
5. Build composition step
6. Create workflow wrapper with progress
7. Add voice library management page

#### Phase 3: Script Generation Enhancement (4-5 hours)
1. Add viral hook templates to prompts.ts
2. Enhance script generation with hooks
3. Add hook variations to output
4. Test script generation

#### Phase 4: Video Composition (3-4 hours)
1. Create FFmpeg composition function
2. Implement video + audio merging
3. Add volume controls
4. Upload composed videos
5. Test composition pipeline

#### Phase 5: Integration & Polish (3-4 hours)
1. Add "Add Voiceover" buttons to results page
2. Connect all workflow steps
3. Add loading states and error handling
4. Test end-to-end workflow
5. Add voice library management

---

## Testing Strategy

### Test Categories

**Unit Tests:**
- Voice cloning function: Valid audio, invalid audio, duplicate names
- Voice generation: Default voices, cloned voices, error handling
- Script generation: Viral hooks, variations, validation

**Integration Tests:**
- Complete workflow: Select voice → Enter script → Preview → Compose
- Voice cloning: Upload → Clone → Use → Delete
- Video composition: Merge video + audio, volume levels

**Edge Cases:**
- Audio file too short (< 5 seconds)
- Duplicate voice names
- Very long scripts (> 5000 characters)
- Video without audio track
- Network failures during generation

**Performance Tests:**
- Voice cloning: < 30 seconds
- Voiceover generation: < 10 seconds per 1000 characters
- Video composition: < 60 seconds for 10-second video

---

## Success Criteria

**Feature is complete when:**
- [ ] Users can click "Add Voiceover" on any completed video
- [ ] Users can browse and select default Replicate voices
- [ ] Users can clone their voice with custom names
- [ ] Users can save multiple named voice clones
- [ ] Script generation with viral hooks works
- [ ] Voice preview works before final generation
- [ ] Video composition combines video + voiceover
- [ ] Users can manage their voice library
- [ ] All operations use Replicate API
- [ ] Workflow is intuitive (4 clear steps)

**Performance Targets:**
- Voice cloning: < 30 seconds
- Voiceover generation: < 10 seconds
- Video composition: < 60 seconds
- Page load: < 2 seconds

**Quality Gates:**
- Zero critical bugs
- All error states handled gracefully
- Mobile responsive
- Accessible (keyboard navigation, screen readers)

---

## Risk Assessment

### Risk 1: Replicate Voice Model Availability
**Likelihood:** MEDIUM  
**Impact:** HIGH  
**Mitigation:** Research models before implementation, have fallback models ready  
**Status:** 🟡

### Risk 2: Voice Cloning Quality
**Likelihood:** MEDIUM  
**Impact:** MEDIUM  
**Mitigation:** Test with various audio samples, set minimum quality requirements  
**Status:** 🟡

### Risk 3: Video Composition Performance
**Likelihood:** LOW  
**Impact:** MEDIUM  
**Mitigation:** Use efficient FFmpeg settings, consider async processing  
**Status:** 🟢

### Risk 4: Complex Workflow UX
**Likelihood:** MEDIUM  
**Impact:** MEDIUM  
**Mitigation:** User testing, clear progress indicators, ability to go back  
**Status:** 🟡

---

## Open Questions

1. **Which Replicate voice model to use for cloning?**
   - Minimax (fast, 5+ sec audio) vs Resemble AI (instant, multilingual)
   - Decision needed by: Phase 1 completion

2. **Script generation - required or optional?**
   - Current plan: Optional (user can write custom)
   - May need: Default to AI generation with option to edit

---

## Timeline

**Total Estimate:** 25-35 hours

| Phase | Task | Time | Status |
|-------|------|------|--------|
| 1 | Replicate Voice Integration | 8-10h | ⏳ |
| 2 | UI Components | 10-12h | ⏳ |
| 3 | Script Generation Enhancement | 4-5h | ⏳ |
| 4 | Video Composition | 3-4h | ⏳ |
| 5 | Integration & Polish | 3-4h | ⏳ |

---

## Dependencies

**Requires:**
- [ ] Existing Replicate integration (already done)
- [ ] Video generation working (already done)
- [ ] Firebase Storage for audio files (already configured)

**Blocks:**
- None (independent feature)

---

## References

- Replicate Voice Models: https://replicate.com/collections/text-to-speech
- Replicate API Docs: https://replicate.com/docs
- FFmpeg Documentation: https://ffmpeg.org/documentation.html
- Firebase Functions: https://firebase.google.com/docs/functions


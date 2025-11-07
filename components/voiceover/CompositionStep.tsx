'use client';

import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase/config';
import { useRouter } from 'next/navigation';

interface VideoData {
  id: string;
  url: string;
  productName?: string;
  brandTone?: string;
  duration?: number;
  metadata?: any;
}

interface WorkflowState {
  selectedVoiceType: 'default' | 'cloned' | 'clone-new' | null;
  selectedVoiceId: string | null;
  clonedVoiceName: string | null;
  script: string | null;
  voiceoverUrl: string | null;
  voiceoverPreviewUrl: string | null;
}

interface CompositionStepProps {
  videoId: string;
  videoData: VideoData;
  state: WorkflowState;
  updateState: (updates: Partial<WorkflowState>) => void;
  onPrevious: () => void;
}

export default function CompositionStep({
  videoData,
  state,
  updateState,
  onPrevious,
}: CompositionStepProps) {
  const router = useRouter();
  const [composing, setComposing] = useState(false);
  const [composedVideoUrl, setComposedVideoUrl] = useState<string | null>(null);
  const [videoVolume, setVideoVolume] = useState(1.0);
  const [voiceoverVolume, setVoiceoverVolume] = useState(1.0);
  const [error, setError] = useState<string | null>(null);

  const handleCompose = async () => {
    if (!videoData.url) {
      alert('Video URL not available');
      return;
    }

    if (!state.voiceoverPreviewUrl && state.script) {
      alert('Please generate a voiceover preview first');
      return;
    }

    try {
      setComposing(true);
      setError(null);

      // If no script, skip voiceover
      const voiceoverUrl = state.script ? state.voiceoverPreviewUrl : null;

      const composeVideo = httpsCallable(functions, 'composeVideoWithVoiceover');
      const result = await composeVideo({
        videoUrl: videoData.url,
        voiceoverUrl: voiceoverUrl,
        videoVolume: videoVolume,
        voiceoverVolume: voiceoverVolume,
      });

      const data = result.data as any;
      if (data.success) {
        setComposedVideoUrl(data.composedVideoUrl);
        updateState({
          voiceoverUrl: voiceoverUrl,
        });

        // TODO: Update video document in Firestore with voiceover info
        // This would mark the video as having a voiceover
      }
    } catch (error: any) {
      console.error('Error composing video:', error);
      setError(error.message || 'Failed to compose video');
    } finally {
      setComposing(false);
    }
  };

  const handleFinish = () => {
    // Navigate back to results page
    router.push('/generate/results');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Compose Final Video</h2>
      <p className="text-gray-600">Combine your video with voiceover</p>

      {/* Video Preview */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Video Preview</h3>
        {videoData.url ? (
          <div className="bg-black rounded-lg overflow-hidden">
            <video
              src={videoData.url}
              controls
              className="w-full"
            />
          </div>
        ) : (
          <div className="bg-gray-100 rounded-lg p-12 text-center text-gray-500">
            Video not available
          </div>
        )}
      </div>

      {/* Volume Controls */}
      {state.script && state.voiceoverPreviewUrl && (
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-900">Volume Controls</h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Video Volume: {Math.round(videoVolume * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={videoVolume}
                onChange={(e) => setVideoVolume(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Voiceover Volume: {Math.round(voiceoverVolume * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={voiceoverVolume}
                onChange={(e) => setVoiceoverVolume(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* Composition Status */}
      {composedVideoUrl ? (
        <div className="space-y-4">
          <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-2">✓ Video Composed Successfully!</h3>
            <p className="text-green-700 text-sm mb-4">
              Your video with voiceover is ready.
            </p>
            <div className="bg-black rounded-lg overflow-hidden">
              <video
                src={composedVideoUrl}
                controls
                className="w-full"
              />
            </div>
            <div className="flex space-x-4 mt-4">
              <a
                href={composedVideoUrl}
                download
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Download Video
              </a>
              <button
                onClick={handleFinish}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Back to Results
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {state.script ? (
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-700">
                Ready to combine your video with the voiceover. Click below to compose the final video.
              </p>
            </div>
          ) : (
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">
                No voiceover selected. The video will remain as-is.
              </p>
            </div>
          )}

          <button
            onClick={handleCompose}
            disabled={composing}
            className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {composing ? 'Composing Video...' : state.script ? 'Compose Video with Voiceover' : 'Save Video'}
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t">
        <button
          onClick={onPrevious}
          className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Previous
        </button>
        {composedVideoUrl && (
          <button
            onClick={handleFinish}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Finish
          </button>
        )}
      </div>
    </div>
  );
}


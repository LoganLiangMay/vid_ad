'use client';

import { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase/config';

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
  voiceoverPreviewUrl: string | null;
}

interface VoicePreviewStepProps {
  videoData: VideoData;
  state: WorkflowState;
  updateState: (updates: Partial<WorkflowState>) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export default function VoicePreviewStep({
  state,
  updateState,
  onNext,
  onPrevious,
}: VoicePreviewStepProps) {
  const [generating, setGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(state.voiceoverPreviewUrl);
  const [speed, setSpeed] = useState(1.0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Auto-generate preview if script exists and voice is selected
    if (state.script && state.selectedVoiceId && !previewUrl) {
      handleGeneratePreview();
    }
  }, []);

  const handleGeneratePreview = async () => {
    if (!state.script || !state.selectedVoiceId) {
      alert('Please select a voice and enter a script first');
      return;
    }

    try {
      setGenerating(true);
      setError(null);

      const generateVoiceover = httpsCallable(functions, 'generateReplicateVoiceover');
      const result = await generateVoiceover({
        text: state.script,
        voiceType: state.selectedVoiceType === 'cloned' || state.selectedVoiceType === 'clone-new' ? 'cloned' : 'default',
        voiceId: state.selectedVoiceId,
        speed: speed,
      });

      const data = result.data as any;
      if (data.success) {
        setPreviewUrl(data.audioUrl);
        updateState({
          voiceoverPreviewUrl: data.audioUrl,
        });
      }
    } catch (error: any) {
      console.error('Error generating preview:', error);
      setError(error.message || 'Failed to generate voiceover preview');
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = () => {
    setPreviewUrl(null);
    handleGeneratePreview();
  };

  const canProceed = () => {
    return previewUrl !== null || state.script === null; // Can proceed if preview exists or no script needed
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Preview Voiceover</h2>
      <p className="text-gray-600">Listen to your voiceover before finalizing</p>

      {/* Voice Selection Summary */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="flex justify-between items-center">
          <div>
            <p className="font-semibold text-gray-900">
              {state.selectedVoiceType === 'cloned' || state.selectedVoiceType === 'clone-new'
                ? `Cloned Voice: ${state.clonedVoiceName || 'Unknown'}`
                : 'Default Voice Selected'}
            </p>
            {state.script && (
              <p className="text-sm text-gray-600 mt-1">
                Script: {state.script.length} characters
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Script Display */}
      {state.script && (
        <div className="p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold mb-2">Script Text:</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{state.script}</p>
        </div>
      )}

      {/* Speed Control */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Playback Speed: {speed}x
        </label>
        <input
          type="range"
          min="0.5"
          max="2.0"
          step="0.1"
          value={speed}
          onChange={(e) => setSpeed(parseFloat(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>0.5x</span>
          <span>1.0x</span>
          <span>2.0x</span>
        </div>
      </div>

      {/* Preview Audio Player */}
      {previewUrl ? (
        <div className="space-y-4">
          <div className="p-6 bg-gray-50 rounded-lg">
            <audio controls className="w-full" src={previewUrl} />
          </div>
          <div className="flex space-x-4">
            <button
              onClick={handleRegenerate}
              disabled={generating}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {generating ? 'Regenerating...' : 'Regenerate Preview'}
            </button>
            <button
              onClick={handleGeneratePreview}
              disabled={generating}
              className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50"
            >
              {generating ? 'Generating...' : 'Update Speed & Regenerate'}
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          {state.script ? (
            <div className="space-y-4">
              <p className="text-gray-600">Click below to generate a preview of your voiceover</p>
              <button
                onClick={handleGeneratePreview}
                disabled={generating}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {generating ? 'Generating Preview...' : 'Generate Preview'}
              </button>
            </div>
          ) : (
            <p className="text-gray-500">No script entered. You can proceed without voiceover.</p>
          )}
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
        <button
          onClick={onNext}
          disabled={!canProceed()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next: Compose Video
        </button>
      </div>
    </div>
  );
}


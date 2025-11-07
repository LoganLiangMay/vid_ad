'use client';

import { useState } from 'react';
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
  script: string | null;
  scriptGenerated: boolean;
}

interface ScriptInputStepProps {
  videoData: VideoData;
  state: WorkflowState;
  updateState: (updates: Partial<WorkflowState>) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export default function ScriptInputStep({
  videoData,
  state,
  updateState,
  onNext,
  onPrevious,
}: ScriptInputStepProps) {
  const [inputMode, setInputMode] = useState<'generate' | 'custom' | 'none'>('generate');
  const [customScript, setCustomScript] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedScript, setGeneratedScript] = useState<any>(null);

  const handleGenerateScript = async () => {
    if (!videoData.metadata) {
      alert('Video metadata not available');
      return;
    }

    try {
      setGenerating(true);

      const generateScript = httpsCallable(functions, 'generateScript');
      const result = await generateScript({
        productName: videoData.metadata.productName || videoData.productName || 'Product',
        productDescription: videoData.metadata.productDescription || '',
        brandTone: videoData.metadata.brandTone || videoData.brandTone || 'professional',
        targetAudience: videoData.metadata.targetAudience,
        duration: videoData.metadata.duration || videoData.duration || 7,
        variationCount: 1,
        keywords: videoData.metadata.keywords || [],
        uniqueSellingPoints: videoData.metadata.uniqueSellingPoints || [],
      });

      const data = result.data as any;
      if (data.success && data.scripts && data.scripts.length > 0) {
        const script = data.scripts[0].script;
        setGeneratedScript(script);
        
        // Combine all scene dialogues into full script text
        const fullScript = script.scenes
          .map((scene: any) => scene.dialogue)
          .join(' ');
        
        updateState({
          script: fullScript,
          scriptGenerated: true,
        });
        setCustomScript(fullScript);
      }
    } catch (error: any) {
      console.error('Error generating script:', error);
      alert(error.message || 'Failed to generate script. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCustomScriptChange = (value: string) => {
    setCustomScript(value);
    updateState({
      script: value,
      scriptGenerated: false,
    });
  };

  const canProceed = () => {
    if (inputMode === 'none') return true; // No script needed
    if (inputMode === 'generate') {
      return state.script !== null && state.script.trim().length > 0;
    }
    if (inputMode === 'custom') {
      return customScript.trim().length > 0;
    }
    return false;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Enter Script</h2>
      <p className="text-gray-600">Generate a script with AI or write your own</p>

      {/* Input Mode Selection */}
      <div className="space-y-4">
        <div className="flex flex-col space-y-2">
          <label className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="inputMode"
              value="generate"
              checked={inputMode === 'generate'}
              onChange={() => setInputMode('generate')}
              className="w-4 h-4 text-blue-600"
            />
            <div className="flex-1">
              <span className="font-semibold">Generate Script with AI</span>
              <p className="text-sm text-gray-600">Use viral hooks and AI to create an engaging script</p>
            </div>
          </label>

          <label className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="inputMode"
              value="custom"
              checked={inputMode === 'custom'}
              onChange={() => setInputMode('custom')}
              className="w-4 h-4 text-blue-600"
            />
            <div className="flex-1">
              <span className="font-semibold">Write Custom Script</span>
              <p className="text-sm text-gray-600">Write your own script text</p>
            </div>
          </label>

          <label className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="inputMode"
              value="none"
              checked={inputMode === 'none'}
              onChange={() => setInputMode('none')}
              className="w-4 h-4 text-blue-600"
            />
            <div className="flex-1">
              <span className="font-semibold">No Script (Music Only)</span>
              <p className="text-sm text-gray-600">Skip voiceover, add background music only</p>
            </div>
          </label>
        </div>
      </div>

      {/* Generate Script */}
      {inputMode === 'generate' && (
        <div className="space-y-4">
          {!state.scriptGenerated ? (
            <div>
              <button
                onClick={handleGenerateScript}
                disabled={generating}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {generating ? 'Generating Script...' : 'Generate Script with Viral Hooks'}
              </button>
              {videoData.metadata && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <strong>Product:</strong> {videoData.metadata.productName || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Tone:</strong> {videoData.metadata.brandTone || 'professional'}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Duration:</strong> {videoData.metadata.duration || 7} seconds
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {generatedScript && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold mb-2">Generated Script</h3>
                  {generatedScript.hook && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-700">Hook:</p>
                      <p className="text-gray-900">{generatedScript.hook}</p>
                    </div>
                  )}
                  {generatedScript.hookVariations && generatedScript.hookVariations.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-700">Hook Variations:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {generatedScript.hookVariations.map((hook: any, idx: number) => (
                          <li key={idx} className="text-sm text-gray-700">
                            {hook.text} (Score: {hook.viralScore}/10)
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Scenes:</p>
                    <div className="space-y-2">
                      {generatedScript.scenes?.map((scene: any) => (
                        <div key={scene.id} className="text-sm text-gray-700 border-l-2 border-blue-500 pl-3">
                          <p className="font-medium">Scene {scene.id} ({scene.duration}s):</p>
                          <p>{scene.dialogue}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <textarea
                value={customScript}
                onChange={(e) => handleCustomScriptChange(e.target.value)}
                placeholder="Edit the generated script or write your own..."
                rows={10}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-sm text-gray-500">
                {customScript.length} characters
              </p>
              <button
                onClick={handleGenerateScript}
                disabled={generating}
                className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50"
              >
                {generating ? 'Regenerating...' : 'Regenerate Script'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Custom Script Input */}
      {inputMode === 'custom' && (
        <div className="space-y-4">
          <textarea
            value={customScript}
            onChange={(e) => handleCustomScriptChange(e.target.value)}
            placeholder="Write your script here... Make it engaging and clear."
            rows={10}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">
              {customScript.length} characters
            </p>
            {videoData.duration && (
              <p className="text-sm text-gray-500">
                Recommended: ~{Math.round(videoData.duration * 2.5)} characters for {videoData.duration}s video
              </p>
            )}
          </div>
        </div>
      )}

      {/* No Script */}
      {inputMode === 'none' && (
        <div className="p-6 bg-gray-50 rounded-lg text-center">
          <p className="text-gray-600">
            No voiceover will be added. You can add background music in the composition step.
          </p>
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
          Next: Preview
        </button>
      </div>
    </div>
  );
}


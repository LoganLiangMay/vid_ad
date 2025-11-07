'use client';

import { useState } from 'react';
import VoiceSelectionStep from './VoiceSelectionStep';
import ScriptInputStep from './ScriptInputStep';
import VoicePreviewStep from './VoicePreviewStep';
import CompositionStep from './CompositionStep';

interface VideoData {
  id: string;
  url: string;
  productName?: string;
  brandTone?: string;
  duration?: number;
  metadata?: any;
}

interface VoiceoverWorkflowProps {
  videoId: string;
  videoData: VideoData;
}

interface WorkflowState {
  step: number;
  selectedVoiceType: 'default' | 'cloned' | 'clone-new' | null;
  selectedVoiceId: string | null;
  clonedVoiceName: string | null;
  script: string | null;
  scriptGenerated: boolean;
  voiceoverUrl: string | null;
  voiceoverPreviewUrl: string | null;
}

const steps = [
  { id: 1, name: 'Select Voice', description: 'Choose default voice or clone your own' },
  { id: 2, name: 'Enter Script', description: 'Generate or write your script' },
  { id: 3, name: 'Preview', description: 'Preview voiceover before finalizing' },
  { id: 4, name: 'Compose', description: 'Combine video and voiceover' },
];

export default function VoiceoverWorkflow({ videoId, videoData }: VoiceoverWorkflowProps) {
  const [state, setState] = useState<WorkflowState>({
    step: 1,
    selectedVoiceType: null,
    selectedVoiceId: null,
    clonedVoiceName: null,
    script: null,
    scriptGenerated: false,
    voiceoverUrl: null,
    voiceoverPreviewUrl: null,
  });

  const handleNext = () => {
    if (state.step < steps.length) {
      setState(prev => ({ ...prev, step: prev.step + 1 }));
    }
  };

  const handlePrevious = () => {
    if (state.step > 1) {
      setState(prev => ({ ...prev, step: prev.step - 1 }));
    }
  };

  const handleStepClick = (stepId: number) => {
    // Allow going back to previous steps
    if (stepId < state.step) {
      setState(prev => ({ ...prev, step: stepId }));
    }
  };

  const updateState = (updates: Partial<WorkflowState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  return (
    <div className="space-y-8">
      {/* Progress Indicator */}
      <div className="bg-white shadow-lg rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <button
                onClick={() => handleStepClick(step.id)}
                disabled={step.id > state.step}
                className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-colors ${
                  step.id < state.step
                    ? 'bg-green-500 text-white'
                    : step.id === state.step
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                } ${step.id <= state.step ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed'}`}
              >
                {step.id < state.step ? '✓' : step.id}
              </button>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    step.id < state.step ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-gray-900">
            {steps[state.step - 1]?.name}
          </h3>
          <p className="text-sm text-gray-600">
            {steps[state.step - 1]?.description}
          </p>
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white shadow-lg rounded-lg p-8">
        {state.step === 1 && (
          <VoiceSelectionStep
            videoData={videoData}
            state={state}
            updateState={updateState}
            onNext={handleNext}
          />
        )}
        {state.step === 2 && (
          <ScriptInputStep
            videoData={videoData}
            state={state}
            updateState={updateState}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        )}
        {state.step === 3 && (
          <VoicePreviewStep
            videoData={videoData}
            state={state}
            updateState={updateState}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        )}
        {state.step === 4 && (
          <CompositionStep
            videoId={videoId}
            videoData={videoData}
            state={state}
            updateState={updateState}
            onPrevious={handlePrevious}
          />
        )}
      </div>
    </div>
  );
}


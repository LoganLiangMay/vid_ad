'use client';

import { UseFormReturn } from 'react-hook-form';
import {
  AdGenerationFormData,
  formatKeywordsToString,
  estimateGenerationCost,
  VideoWorkflow,
} from '@/lib/schemas/adGenerationSchema';

interface ReviewStepProps {
  form: UseFormReturn<AdGenerationFormData>;
  creativeDirection: string;
  onCreativeDirectionChange: (value: string) => void;
}

export default function ReviewStep({ form, creativeDirection, onCreativeDirectionChange }: ReviewStepProps) {
  const { watch, setValue } = form;
  const formData = watch();
  const workflow = formData.workflow || VideoWorkflow.IMAGE_TO_VIDEO;

  const estimatedCost = estimateGenerationCost(
    formData.videoModel,
    formData.duration,
    formData.variations,
    formData.resolution
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Choose Your Flow</h2>
        <p className="text-gray-600">Review your settings and select how you want to create your video</p>
      </div>

      <div className="space-y-6">
        {/* Product Information */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">Product Information</h3>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">Product Name:</dt>
              <dd className="text-sm font-medium text-gray-900">{formData.productName}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600 mb-1">Description:</dt>
              <dd className="text-sm text-gray-900">{formData.productDescription}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600 mb-1">Keywords:</dt>
              <dd className="text-sm text-gray-900">
                {typeof formData.keywords === 'string'
                  ? formData.keywords
                  : formatKeywordsToString(formData.keywords || [])}
              </dd>
            </div>
            {formData.targetAudience && (
              <div>
                <dt className="text-sm text-gray-600 mb-1">Target Audience:</dt>
                <dd className="text-sm text-gray-900">{formData.targetAudience}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Brand Settings */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">Brand Settings</h3>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">Brand Tone:</dt>
              <dd className="text-sm font-medium text-gray-900 capitalize">{formData.brandTone}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-sm text-gray-600">Primary Color:</dt>
              <dd className="flex items-center space-x-2">
                <div
                  className="w-6 h-6 rounded border border-gray-300"
                  style={{ backgroundColor: formData.primaryColor }}
                />
                <span className="text-sm font-medium text-gray-900">{formData.primaryColor}</span>
              </dd>
            </div>
            {formData.callToAction && (
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">Call to Action:</dt>
                <dd className="text-sm font-medium text-gray-900">{formData.callToAction}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Additional Options */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">Additional Options</h3>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">Voiceover:</dt>
              <dd className="text-sm font-medium text-gray-900">
                {formData.includeVoiceover ? `Yes (${formData.voiceStyle})` : 'No'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">Background Music:</dt>
              <dd className="text-sm font-medium text-gray-900">
                {formData.includeBackgroundMusic ? 'Yes' : 'No'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">Product Images:</dt>
              <dd className="text-sm font-medium text-gray-900">
                {formData.productImages?.length || 0} uploaded
              </dd>
            </div>
          </dl>
        </div>

        {/* Workflow Selection */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-purple-300 rounded-lg p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Select Your Workflow</h3>
            <p className="text-sm text-gray-600">
              Choose how you want to create your video ad
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Workflow 1: Image-to-Video */}
            <div
              onClick={() => setValue('workflow', VideoWorkflow.IMAGE_TO_VIDEO)}
              className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                workflow === VideoWorkflow.IMAGE_TO_VIDEO
                  ? 'border-purple-600 bg-white shadow-lg'
                  : 'border-purple-200 bg-white hover:border-purple-300 hover:shadow-md'
              }`}
            >
              {/* Selection Indicator */}
              {workflow === VideoWorkflow.IMAGE_TO_VIDEO && (
                <div className="absolute top-3 right-3 bg-purple-600 text-white p-1 rounded-full">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className="text-3xl">🖼️</div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    Image-to-Video
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Generate 5 concept images, select your favorite, then create video with Kling AI
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                      Fast
                    </span>
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                      Single Scene
                    </span>
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                      Kling AI
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Workflow 2: Text-to-Video */}
            <div
              onClick={() => setValue('workflow', VideoWorkflow.TEXT_TO_VIDEO)}
              className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                workflow === VideoWorkflow.TEXT_TO_VIDEO
                  ? 'border-purple-600 bg-white shadow-lg'
                  : 'border-purple-200 bg-white hover:border-purple-300 hover:shadow-md'
              }`}
            >
              {/* Selection Indicator */}
              {workflow === VideoWorkflow.TEXT_TO_VIDEO && (
                <div className="absolute top-3 right-3 bg-purple-600 text-white p-1 rounded-full">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className="text-3xl">📝</div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    Text-to-Video
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Create narrative concepts with detailed storyboards and multi-scene videos
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                      Narrative
                    </span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                      Multi-Scene
                    </span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                      Storyboard
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Workflow 3: Yolo Mode */}
            <div
              onClick={() => setValue('workflow', VideoWorkflow.YOLO_MODE)}
              className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                workflow === VideoWorkflow.YOLO_MODE
                  ? 'border-green-600 bg-white shadow-lg'
                  : 'border-purple-200 bg-white hover:border-green-300 hover:shadow-md'
              }`}
            >
              {/* Selection Indicator */}
              {workflow === VideoWorkflow.YOLO_MODE && (
                <div className="absolute top-3 right-3 bg-green-600 text-white p-1 rounded-full">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className="text-3xl">⚡</div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    Yolo Mode
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Auto-generate video directly from your input using Kling AI - no concept selection
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                      Instant
                    </span>
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                      Auto
                    </span>
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                      Kling AI
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-white border border-purple-200 rounded-lg">
            <p className="text-xs text-gray-600">
              💡 <strong>Note:</strong> Choose the workflow that best fits your needs. You can always try different workflows later.
            </p>
          </div>
        </div>

        {/* Creative Direction (Optional) */}
        <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6">
          <div className="flex items-start mb-3">
            <svg
              className="flex-shrink-0 h-6 w-6 text-purple-600 mt-0.5 mr-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            <div className="flex-1">
              <h3 className="font-medium text-purple-900 mb-1">
                Creative Direction (Optional)
              </h3>
              <p className="text-sm text-purple-700">
                Share your vision! Describe what you want to see in your ad. Our AI will use this to generate
                concepts tailored to your direction.
              </p>
            </div>
          </div>

          <textarea
            value={creativeDirection}
            onChange={(e) => onCreativeDirectionChange(e.target.value)}
            placeholder='Example: "Generate an ad with a clothing photoshoot showing different angles. Make it outdoors with natural lighting and a beach setting. Show the model in motion with dynamic poses."'
            rows={4}
            className="w-full px-4 py-3 border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 placeholder-gray-500 resize-none"
          />

          <p className="text-xs text-purple-600 mt-2">
            💡 Tip: Be specific about settings, angles, mood, and visual style you envision
          </p>
        </div>

        {/* Cost Summary */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-medium text-gray-900">Estimated Generation Cost</h3>
              <p className="text-xs text-gray-600 mt-1">
                This estimate includes video generation only
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-600">${estimatedCost.toFixed(2)}</p>
              <p className="text-xs text-gray-600">
                {formData.variations} × {formData.duration}s × {formData.videoModel === 'seedance-1-pro' ? 'Pro' : 'Lite'} @ {formData.resolution}
              </p>
            </div>
          </div>
        </div>

        {/* Generation Notice */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <svg
              className="flex-shrink-0 h-5 w-5 text-yellow-400 mt-0.5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Generation Time</h3>
              <p className="mt-1 text-sm text-yellow-700">
                Video generation typically takes 2-5 minutes. You'll receive real-time updates
                on the progress and can track the status in your dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
'use client';

import { UseFormReturn } from 'react-hook-form';
import {
  AdGenerationFormData,
  VideoOrientation,
  VideoResolution,
  VideoFrameRate,
  ReplicateModel,
  estimateGenerationCost,
} from '@/lib/schemas/adGenerationSchema';

interface VideoConfigStepProps {
  form: UseFormReturn<AdGenerationFormData>;
}

export default function VideoConfigStep({ form }: VideoConfigStepProps) {
  const {
    register,
    watch,
  } = form;

  const variations = watch('variations');
  const duration = watch('duration');
  const orientation = watch('orientation');
  const resolution = watch('resolution');
  const videoModel = watch('videoModel');

  const estimatedCost = estimateGenerationCost(videoModel, duration, variations, resolution);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Video Configuration</h2>
        <p className="text-gray-600">Your video will be configured with default settings</p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <p className="text-gray-700">
          Videos will be generated with optimal default settings. You can customize these settings in future updates.
        </p>
      </div>
    </div>
  );
}
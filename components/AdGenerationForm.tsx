'use client';

import { useState, useMemo } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { AdGenerationFormData, VideoWorkflow } from '@/lib/schemas/adGenerationSchema';
import FormStepIndicator from './form/FormStepIndicator';
import ProductInfoStep from './form/ProductInfoStep';
import BrandSettingsStep from './form/BrandSettingsStep';
import VideoConfigStep from './form/VideoConfigStep';
import AdditionalOptionsStep from './form/AdditionalOptionsStep';
import ReviewStep from './form/ReviewStep';
import ConceptSelectionStep from './form/ConceptSelectionStep';
import StoryboardStep from './form/StoryboardStep';

interface AdGenerationFormProps {
  form: UseFormReturn<AdGenerationFormData>;
  onSubmit: (data: AdGenerationFormData) => void;
  isSubmitting: boolean;
  onStepChange?: (step: number, formData: AdGenerationFormData) => void;
}

// Define steps for each workflow
const imageToVideoSteps = [
  { id: 1, name: 'Product Info', description: 'Basic product details' },
  { id: 2, name: 'Brand Settings', description: 'Brand tone and style' },
  { id: 3, name: 'Additional Options', description: 'Extra features' },
  { id: 4, name: 'Flows', description: 'Select workflow' },
  { id: 5, name: 'Concept', description: 'Select concept image' },
  { id: 6, name: 'Video Config', description: 'Video specifications' },
];

const textToVideoSteps = [
  { id: 1, name: 'Product Info', description: 'Basic product details' },
  { id: 2, name: 'Brand Settings', description: 'Brand tone and style' },
  { id: 3, name: 'Additional Options', description: 'Extra features' },
  { id: 4, name: 'Flows', description: 'Select workflow' },
  { id: 5, name: 'Concept', description: 'Select creative concept' },
  { id: 6, name: 'Storyboard', description: 'Review scene images' },
  { id: 7, name: 'Video Config', description: 'Video specifications' },
];

const yoloModeSteps = [
  { id: 1, name: 'Product Info', description: 'Basic product details' },
  { id: 2, name: 'Brand Settings', description: 'Brand tone and style' },
  { id: 3, name: 'Additional Options', description: 'Extra features' },
  { id: 4, name: 'Flows', description: 'Select workflow' },
  { id: 5, name: 'Video Config', description: 'Video specifications' },
];

export default function AdGenerationForm({
  form,
  onSubmit,
  isSubmitting,
  onStepChange,
}: AdGenerationFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [creativeDirection, setCreativeDirection] = useState('');
  const [selectedConcept, setSelectedConcept] = useState<any>(null);
  const [storyboardImages, setStoryboardImages] = useState<any[]>([]);
  const [numberOfScenes, setNumberOfScenes] = useState(5); // Default 5 scenes

  // Determine which workflow is selected and get appropriate steps
  const workflow = form.watch('workflow') || VideoWorkflow.IMAGE_TO_VIDEO;
  const isImageToVideo = workflow === VideoWorkflow.IMAGE_TO_VIDEO;
  const isYoloMode = workflow === VideoWorkflow.YOLO_MODE;
  const steps = useMemo(() => {
    if (isYoloMode) return yoloModeSteps;
    if (isImageToVideo) return imageToVideoSteps;
    return textToVideoSteps;
  }, [isImageToVideo, isYoloMode]);

  const handleNext = async () => {
    // Validate current step fields before proceeding
    let fieldsToValidate: (keyof AdGenerationFormData)[] = [];

    switch (currentStep) {
      case 1:
        fieldsToValidate = ['productName', 'productDescription', 'keywords'];
        break;
      case 2:
        fieldsToValidate = ['brandTone', 'primaryColor'];
        break;
      case 3:
        // Optional fields, no validation needed
        break;
      case 4:
        // Flows step - workflow selection is required
        fieldsToValidate = ['workflow'];
        break;
      case 5:
        // For Yolo Mode: Video Config, then auto-submit
        if (isYoloMode) {
          fieldsToValidate = ['variations', 'duration', 'orientation', 'resolution', 'frameRate', 'videoModel'];
          // Validate and auto-submit
          const isValid = await form.trigger(fieldsToValidate);
          if (!isValid) return;

          // Auto-submit the form for video generation
          form.handleSubmit(onSubmit)();
          return;
        }
        // For other workflows: Concept selection is required
        if (!selectedConcept) {
          alert('Please select a concept before proceeding');
          return;
        }
        break;
      case 6:
        // For Image-to-Video: Video Config validation
        // For Text-to-Video: Storyboard (no validation)
        if (isImageToVideo) {
          fieldsToValidate = ['variations', 'duration', 'orientation', 'resolution', 'frameRate', 'videoModel'];
        }
        break;
      case 7:
        // Text-to-Video: Video Config validation
        if (!isImageToVideo && !isYoloMode) {
          fieldsToValidate = ['variations', 'duration', 'orientation', 'resolution', 'frameRate', 'videoModel'];
        }
        break;
    }

    if (fieldsToValidate.length > 0) {
      const isValid = await form.trigger(fieldsToValidate);
      if (!isValid) return;
    }

    if (currentStep < steps.length) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);

      // Notify parent of step change
      if (onStepChange) {
        onStepChange(nextStep, form.getValues());
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);

      // Notify parent of step change
      if (onStepChange) {
        onStepChange(prevStep, form.getValues());
      }
    }
  };

  const handleStepClick = async (stepId: number) => {
    // Allow going back without validation
    if (stepId < currentStep) {
      setCurrentStep(stepId);

      // Notify parent of step change
      if (onStepChange) {
        onStepChange(stepId, form.getValues());
      }
      return;
    }

    // Validate all previous steps when jumping forward
    let allValid = true;
    for (let i = 1; i < stepId; i++) {
      let fieldsToValidate: (keyof AdGenerationFormData)[] = [];

      switch (i) {
        case 1:
          fieldsToValidate = ['productName', 'productDescription', 'keywords'];
          break;
        case 2:
          fieldsToValidate = ['brandTone', 'primaryColor'];
          break;
        case 4:
          // Flows step - workflow selection
          fieldsToValidate = ['workflow'];
          break;
        case 6:
          // For Image-to-Video: Video Config validation
          if (isImageToVideo) {
            fieldsToValidate = ['variations', 'duration', 'orientation', 'resolution', 'frameRate', 'videoModel'];
          }
          break;
        case 7:
          // For Text-to-Video: Video Config validation
          if (!isImageToVideo) {
            fieldsToValidate = ['variations', 'duration', 'orientation', 'resolution', 'frameRate', 'videoModel'];
          }
          break;
      }

      if (fieldsToValidate.length > 0) {
        const isValid = await form.trigger(fieldsToValidate);
        if (!isValid) {
          allValid = false;
          break;
        }
      }
    }

    if (allValid) {
      setCurrentStep(stepId);

      // Notify parent of step change
      if (onStepChange) {
        onStepChange(stepId, form.getValues());
      }
    }
  };

  const handleSubmit = form.handleSubmit(
    (data) => {
      // Attach concept and storyboard data
      const submissionData = {
        ...data,
        selectedConcept,
        storyboardImages,
      };
      onSubmit(submissionData);
    },
    (errors) => {
      console.error('❌ Form validation errors:', errors);
      alert('Please fix the following errors:\n\n' +
        Object.entries(errors)
          .map(([field, error]: [string, any]) => `${field}: ${error?.message || 'Invalid value'}`)
          .join('\n')
      );
    }
  );

  return (
    <div className="space-y-8">
      <FormStepIndicator
        steps={steps}
        currentStep={currentStep}
        onStepClick={handleStepClick}
      />

      <div className="bg-white shadow-lg rounded-lg p-8 relative">
        {/* Loading Overlay */}
        {isSubmitting && (
          <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50 rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
              <p className="text-lg font-semibold text-gray-900">Preparing your video generation...</p>
              <p className="text-sm text-gray-600 mt-2">This will only take a moment</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {currentStep === 1 && <ProductInfoStep form={form} />}
          {currentStep === 2 && <BrandSettingsStep form={form} />}
          {currentStep === 3 && <AdditionalOptionsStep form={form} />}
          {currentStep === 4 && (
            <ReviewStep
              form={form}
              creativeDirection={creativeDirection}
              onCreativeDirectionChange={setCreativeDirection}
            />
          )}

          {/* Concept step - not shown for Yolo Mode */}
          {!isYoloMode && currentStep === 5 && (
            <ConceptSelectionStep
              formData={form.getValues()}
              creativeDirection={creativeDirection}
              selectedConcept={selectedConcept}
              onSelectConcept={setSelectedConcept}
              numberOfScenes={numberOfScenes}
              onNumberOfScenesChange={setNumberOfScenes}
            />
          )}

          {/* Storyboard step - only for Text-to-Video workflow */}
          {!isImageToVideo && !isYoloMode && currentStep === 6 && (
            <StoryboardStep
              formData={form.getValues()}
              selectedConcept={selectedConcept}
              images={storyboardImages}
              onImagesChange={setStoryboardImages}
              numberOfScenes={numberOfScenes}
            />
          )}

          {/* Video Config - step 5 for Yolo Mode, step 6 for Image-to-Video, step 7 for Text-to-Video */}
          {((isYoloMode && currentStep === 5) || (isImageToVideo && currentStep === 6) || (!isImageToVideo && !isYoloMode && currentStep === 7)) && (
            <VideoConfigStep form={form} />
          )}

          <div className="flex justify-between pt-6 border-t">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <div className="space-x-4">
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem('adGenerationDraft', JSON.stringify(form.getValues()));
                }}
                className="px-6 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50"
              >
                Save Draft
              </button>

              {currentStep < steps.length ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className={`px-6 py-2 text-white rounded-lg ${
                    isYoloMode && currentStep === 5
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isYoloMode && currentStep === 5 ? 'Generate Video' : 'Next'}
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  onClick={() => console.log('🖱️ Generate Video button clicked')}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Generating...' : 'Generate Video'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { AdGenerationFormData } from '@/lib/schemas/adGenerationSchema';

interface SceneImage {
  id: string;
  url: string;
  prompt: string;
  sceneNumber: number;
  description?: string;
  cameraAngle?: string;
  lighting?: string;
  mood?: string;
}

interface StoryboardStepProps {
  formData: AdGenerationFormData;
  selectedConcept: any;
  images: SceneImage[];
  onImagesChange: (images: SceneImage[]) => void;
}

export default function StoryboardStep({
  formData,
  selectedConcept,
  images,
  onImagesChange,
}: StoryboardStepProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (images.length === 0) {
      generateStoryboard();
    } else {
      // Select all images by default
      setSelectedImages(new Set(images.map((img) => img.id)));
    }
  }, []);

  const generateStoryboard = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      console.log('🎬 Generating storyboard from concept...');

      const response = await fetch(
        'https://us-central1-vid-ad.cloudfunctions.net/generateScenes',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            formData: {
              ...formData,
              // Include concept context
              conceptTagline: selectedConcept?.tagline,
              conceptNarrative: selectedConcept?.narrativeArc,
              conceptVisualStyle: selectedConcept?.visualStyle,
            },
            numberOfScenes: selectedConcept?.sceneBreakdown?.length || 5,
          }),
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate storyboard');
      }

      onImagesChange(data.images);
      setSelectedImages(new Set(data.images.map((img: SceneImage) => img.id)));
      console.log('✅ Storyboard generated successfully');
    } catch (err) {
      console.error('❌ Error generating storyboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate storyboard');
    } finally {
      setIsGenerating(false);
    }
  };

  const regenerateScene = async (sceneNumber: number) => {
    setIsRegenerating(true);

    try {
      const scene = images.find((img) => img.sceneNumber === sceneNumber);
      if (!scene) return;

      const response = await fetch(
        'https://us-central1-vid-ad.cloudfunctions.net/regenerateScene',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            originalPrompt: scene.prompt,
            sceneNumber: sceneNumber,
          }),
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      // Update the image in the array
      const updatedImages = images.map((img) =>
        img.sceneNumber === sceneNumber ? data.image : img
      );
      onImagesChange(updatedImages);
    } catch (err) {
      console.error('❌ Error regenerating scene:', err);
      alert('Failed to regenerate scene');
    } finally {
      setIsRegenerating(false);
    }
  };

  const moveImage = (fromIndex: number, toIndex: number) => {
    const newImages = [...images];
    const [movedImage] = newImages.splice(fromIndex, 1);
    if (!movedImage) return;
    newImages.splice(toIndex, 0, movedImage);

    // Update scene numbers
    const updatedImages = newImages.map((img, idx) => ({
      ...img,
      sceneNumber: idx + 1,
    }));

    onImagesChange(updatedImages);
  };

  const toggleImageSelection = (imageId: string) => {
    setSelectedImages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(imageId)) {
        newSet.delete(imageId);
      } else {
        newSet.add(imageId);
      }
      return newSet;
    });
  };

  if (isGenerating) {
    return (
      <div className="min-h-[500px] flex items-center justify-center">
        <div className="text-center max-w-2xl">
          <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-purple-600 mx-auto mb-6"></div>
          <h3 className="text-3xl font-bold text-gray-800 mb-3">
            Generating Your Storyboard...
          </h3>
          <p className="text-gray-600 mb-2">
            Creating {selectedConcept?.sceneBreakdown?.length || 5} unique images for your
            concept
          </p>
          <p className="text-sm text-gray-500">This will take about 10-15 seconds</p>

          {selectedConcept && (
            <div className="mt-6 bg-purple-50 rounded-lg p-4 text-left">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Concept:</span> {selectedConcept.tagline}
              </p>
              <p className="text-sm text-gray-700 mt-1">
                <span className="font-semibold">Style:</span> {selectedConcept.visualStyle}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[500px] flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">Generation Failed</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={generateStoryboard}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Review Your Storyboard</h2>
        <p className="text-gray-600">
          Select, reorder, or regenerate scenes before creating your video
        </p>
        {selectedConcept && (
          <p className="text-sm text-purple-600 mt-1">
            Based on: <strong>{selectedConcept.tagline}</strong>
          </p>
        )}
      </div>

      {/* Image Gallery */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {images.map((image, index) => (
          <div
            key={image.id}
            className={`relative group rounded-xl overflow-hidden border-4 transition-all ${
              selectedImages.has(image.id)
                ? 'border-green-500 shadow-lg'
                : 'border-gray-200 opacity-60'
            }`}
          >
            {/* Image */}
            <div className="aspect-[9/16] relative bg-gray-100">
              {image.url ? (
                <img
                  src={image.url}
                  alt={`Scene ${image.sceneNumber}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error('Image load error:', image.url);
                    e.currentTarget.src =
                      'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="711"><rect width="400" height="711" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-family="sans-serif" font-size="16">Failed to load</text></svg>';
                  }}
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                </div>
              )}

              {/* Scene Number Badge */}
              <div className="absolute top-2 left-2 bg-purple-600 text-white px-2 py-1 rounded-full text-xs font-bold">
                Scene {image.sceneNumber}
              </div>

              {/* Selection Indicator */}
              {selectedImages.has(image.id) && (
                <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-2 bg-white space-y-1">
              {image.mood && (
                <p className="text-xs text-purple-600 font-medium truncate">
                  {image.mood}
                </p>
              )}

              <div className="flex gap-1">
                <button
                  onClick={() => regenerateScene(image.sceneNumber)}
                  disabled={isRegenerating}
                  className="flex-1 px-2 py-1 text-xs border border-purple-600 text-purple-600 rounded hover:bg-purple-50 disabled:opacity-50"
                >
                  🔄
                </button>

                <button
                  onClick={() => toggleImageSelection(image.id)}
                  className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                    selectedImages.has(image.id)
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {selectedImages.has(image.id) ? '✓' : '○'}
                </button>
              </div>

              {/* Reorder Buttons */}
              <div className="flex gap-1">
                <button
                  onClick={() => moveImage(index, Math.max(0, index - 1))}
                  disabled={index === 0}
                  className="flex-1 px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-30 text-xs"
                >
                  ←
                </button>
                <button
                  onClick={() => moveImage(index, Math.min(images.length - 1, index + 1))}
                  disabled={index === images.length - 1}
                  className="flex-1 px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-30 text-xs"
                >
                  →
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
        <p className="text-sm text-purple-900">
          <strong>{selectedImages.size} scenes selected</strong> - Click "Generate Video" to
          create your final {formData.duration}-second video
        </p>
      </div>
    </div>
  );
}

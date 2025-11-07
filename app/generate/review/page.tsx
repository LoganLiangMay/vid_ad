'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';

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

function SceneReviewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [images, setImages] = useState<SceneImage[]>([]);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(true);
  const [formData, setFormData] = useState<any>(null);

  // Load images and form data
  useEffect(() => {
    const campaignId = searchParams.get('campaignId');
    if (!campaignId) {
      alert('No campaign ID found');
      router.push('/generate');
      return;
    }

    // Load campaign data
    const campaignKey = `campaign_${campaignId}`;
    const campaignDataStr = localStorage.getItem(campaignKey);

    if (!campaignDataStr) {
      alert('Campaign data not found');
      router.push('/generate');
      return;
    }

    const campaignData = JSON.parse(campaignDataStr);
    setFormData(campaignData);

    // Check if images already generated
    const imagesKey = `campaign_${campaignId}_images`;
    const existingImages = localStorage.getItem(imagesKey);

    if (existingImages) {
      const parsedImages = JSON.parse(existingImages);
      setImages(parsedImages);
      setSelectedImages(new Set(parsedImages.map((img: SceneImage) => img.id)));
      setIsGenerating(false);
    } else {
      // Generate images
      generateImages(campaignData, campaignId);
    }
  }, [searchParams, router]);

  const generateImages = async (campaignData: any, campaignId: string) => {
    setIsGenerating(true);

    try {
      // Call Firebase Cloud Function instead of Next.js API route
      const response = await fetch(
        'https://us-central1-vid-ad.cloudfunctions.net/generateScenes',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            formData: campaignData,
            numberOfScenes: 5,
          }),
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate images');
      }

      setImages(data.images);

      // Select all by default
      const allIds = new Set<string>(data.images.map((img: SceneImage) => img.id));
      setSelectedImages(allIds);

      // Save to localStorage
      const imagesKey = `campaign_${campaignId}_images`;
      localStorage.setItem(imagesKey, JSON.stringify(data.images));

      setIsGenerating(false);
    } catch (error) {
      console.error('Error:', error);
      alert(`Failed to generate images: ${error instanceof Error ? error.message : 'Unknown error'}`);
      router.push('/generate');
    }
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

    setImages(updatedImages);

    // Update in localStorage
    const campaignId = searchParams.get('campaignId');
    if (campaignId) {
      const imagesKey = `campaign_${campaignId}_images`;
      localStorage.setItem(imagesKey, JSON.stringify(updatedImages));
    }
  };

  const regenerateScene = async (sceneNumber: number) => {
    setIsLoading(true);

    try {
      const scene = images.find((img) => img.sceneNumber === sceneNumber);
      if (!scene) {
        setIsLoading(false);
        return;
      }

      // Call Firebase Cloud Function instead of Next.js API route
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
      setImages((prevImages) =>
        prevImages.map((img) => (img.sceneNumber === sceneNumber ? data.image : img))
      );

      // Update in localStorage
      const campaignId = searchParams.get('campaignId');
      if (campaignId) {
        const imagesKey = `campaign_${campaignId}_images`;
        const updatedImages = images.map((img) =>
          img.sceneNumber === sceneNumber ? data.image : img
        );
        localStorage.setItem(imagesKey, JSON.stringify(updatedImages));
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to regenerate image');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProceedToVideo = () => {
    const selected = images.filter((img) => selectedImages.has(img.id));

    if (selected.length < 2) {
      alert('Please select at least 2 images to create a video');
      return;
    }

    // Save selected images
    const campaignId = searchParams.get('campaignId');
    if (campaignId) {
      const selectedKey = `campaign_${campaignId}_selected_images`;
      localStorage.setItem(selectedKey, JSON.stringify(selected));

      // Navigate to results page
      router.push(`/generate/results/?campaignId=${campaignId}`);
    }
  };

  if (isGenerating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-12 text-center">
          <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-purple-600 mx-auto mb-6"></div>
          <h2 className="text-3xl font-bold text-gray-800 mb-3">
            Generating Your Scenes...
          </h2>
          <p className="text-gray-600 mb-2">
            Creating 5 unique images optimized for your product
          </p>
          <p className="text-sm text-gray-500">This will take about 10-15 seconds</p>
          {formData && (
            <div className="mt-6 text-left bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Product:</span> {formData.productName}
              </p>
              <p className="text-sm text-gray-700 mt-1">
                <span className="font-semibold">Brand Tone:</span> {formData.brandTone}
              </p>
              <p className="text-sm text-gray-700 mt-1">
                <span className="font-semibold">Orientation:</span> {formData.orientation}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-800">Review Your Scenes</h2>
              <p className="text-gray-600 mt-1">
                Select, reorder, or regenerate scenes before creating your video
              </p>
              {formData && (
                <p className="text-sm text-gray-500 mt-2">
                  Product: {formData.productName} • {formData.brandTone} tone •{' '}
                  {formData.orientation}
                </p>
              )}
            </div>
            <button
              onClick={() => router.push('/generate?new=true')}
              className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              ← Start Over
            </button>
          </div>

          {/* Image Gallery */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
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
                  <Image
                    src={image.url}
                    alt={`Scene ${image.sceneNumber}`}
                    fill
                    className="object-cover"
                  />

                  {/* Scene Number Badge */}
                  <div className="absolute top-3 left-3 bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                    Scene {image.sceneNumber}
                  </div>

                  {/* Selection Indicator */}
                  {selectedImages.has(image.id) && (
                    <div className="absolute top-3 right-3 bg-green-500 text-white p-2 rounded-full">
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
                <div className="p-4 bg-white space-y-2">
                  {image.description && (
                    <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                      {image.description}
                    </p>
                  )}

                  {image.mood && (
                    <p className="text-xs text-purple-600 font-medium">
                      Mood: {image.mood}
                    </p>
                  )}

                  <div className="flex gap-2">
                    {/* Regenerate Button */}
                    <button
                      onClick={() => regenerateScene(image.sceneNumber)}
                      disabled={isLoading}
                      className="flex-1 px-3 py-2 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      🔄 Regenerate
                    </button>

                    {/* Select/Deselect Button */}
                    <button
                      onClick={() => toggleImageSelection(image.id)}
                      className={`flex-1 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                        selectedImages.has(image.id)
                          ? 'bg-green-500 text-white hover:bg-green-600'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {selectedImages.has(image.id) ? '✓ Selected' : 'Select'}
                    </button>
                  </div>

                  {/* Reorder Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => moveImage(index, Math.max(0, index - 1))}
                      disabled={index === 0}
                      className="flex-1 px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-30 text-xs"
                    >
                      ← Move Up
                    </button>
                    <button
                      onClick={() =>
                        moveImage(index, Math.min(images.length - 1, index + 1))
                      }
                      disabled={index === images.length - 1}
                      className="flex-1 px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-30 text-xs"
                    >
                      Move Down →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Proceed Button */}
          <div className="border-t pt-6">
            <div className="max-w-2xl mx-auto">
              <p className="text-center text-gray-600 mb-4">
                {selectedImages.size} scene{selectedImages.size !== 1 ? 's' : ''} selected
              </p>
              <button
                onClick={handleProceedToVideo}
                disabled={selectedImages.size < 2}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-lg font-semibold text-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Video from Selected Scenes →
              </button>
              <p className="text-sm text-gray-500 text-center mt-3">
                Next: We'll convert these images into a {formData?.duration || 7}-second
                video
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SceneReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-purple-600"></div>
        </div>
      }
    >
      <SceneReviewContent />
    </Suspense>
  );
}

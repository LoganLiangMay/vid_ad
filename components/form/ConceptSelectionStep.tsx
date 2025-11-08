'use client';

import { useState, useEffect } from 'react';
import { AdGenerationFormData, VideoWorkflow } from '@/lib/schemas/adGenerationSchema';

interface Concept {
  id: string;
  tagline: string;
  narrativeArc: string;
  visualStyle: string;
  targetEmotion: string;
  sceneBreakdown: string[];
}

interface ImageConcept {
  id: string;
  url: string;
  prompt: string;
  videoPrompt?: string;
  description?: string;
}

interface ConceptSelectionStepProps {
  formData: AdGenerationFormData;
  creativeDirection: string;
  selectedConcept: Concept | ImageConcept | null;
  onSelectConcept: (concept: Concept | ImageConcept) => void;
  numberOfScenes: number;
  onNumberOfScenesChange: (num: number) => void;
}

export default function ConceptSelectionStep({
  formData,
  creativeDirection,
  selectedConcept,
  onSelectConcept,
  numberOfScenes,
  onNumberOfScenesChange,
}: ConceptSelectionStepProps) {
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [imageConcepts, setImageConcepts] = useState<ImageConcept[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New state for image-to-video workflow
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>('');
  const [uploadedVideoPrompt, setUploadedVideoPrompt] = useState<string>('');
  const [isGeneratingUploadPrompt, setIsGeneratingUploadPrompt] = useState(false);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [editedPrompts, setEditedPrompts] = useState<Record<string, string>>({});
  const [regeneratingImageId, setRegeneratingImageId] = useState<string | null>(null);

  // State for scene adaptation
  const [isAdaptingScenes, setIsAdaptingScenes] = useState(false);
  const [initialSceneCount, setInitialSceneCount] = useState<number>(5);

  // Determine which workflow is selected
  const isImageToVideo = formData.workflow === VideoWorkflow.IMAGE_TO_VIDEO;

  useEffect(() => {
    if (isImageToVideo) {
      generateImageConcepts();
    } else {
      generateConcepts();
    }
  }, []);

  // Auto-adapt scenes when numberOfScenes changes
  useEffect(() => {
    // Only adapt if concepts are loaded and scene count actually changed
    if (!isLoading && concepts.length > 0 && numberOfScenes !== initialSceneCount) {
      console.log(`🔄 Scene count changed from ${initialSceneCount} to ${numberOfScenes}, adapting all concepts...`);
      adaptConceptsToSceneCount(numberOfScenes);
    }
  }, [numberOfScenes]);

  const generateConcepts = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🎨 Generating 3 creative concepts...');

      const response = await fetch(
        'https://us-central1-vid-ad.cloudfunctions.net/generateConcepts',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productName: formData.productName,
            productDescription: formData.productDescription,
            keywords: formData.keywords,
            brandTone: formData.brandTone,
            targetAudience: formData.targetAudience,
            duration: formData.duration,
            creativeDirection: creativeDirection || undefined, // Include user's creative vision
          }),
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate concepts');
      }

      setConcepts(data.concepts);
      // Set initial scene count from first concept
      if (data.concepts.length > 0 && data.concepts[0].sceneBreakdown) {
        setInitialSceneCount(data.concepts[0].sceneBreakdown.length);
      }
      console.log('✅ Generated concepts:', data.concepts);
    } catch (err) {
      console.error('❌ Error generating concepts:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate concepts');
    } finally {
      setIsLoading(false);
    }
  };

  const adaptConceptsToSceneCount = async (newSceneCount: number) => {
    if (isAdaptingScenes) return; // Prevent multiple simultaneous adaptations

    setIsAdaptingScenes(true);
    console.log(`🤖 Using OpenAI to adapt ${concepts.length} concepts to ${newSceneCount} scenes...`);

    try {
      const adaptedConcepts = await Promise.all(
        concepts.map(async (concept) => {
          try {
            const response = await fetch(
              'https://us-central1-vid-ad.cloudfunctions.net/adaptSceneBreakdown',
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  concept: {
                    tagline: concept.tagline,
                    narrativeArc: concept.narrativeArc,
                    visualStyle: concept.visualStyle,
                    targetEmotion: concept.targetEmotion,
                    currentScenes: concept.sceneBreakdown,
                  },
                  targetSceneCount: newSceneCount,
                  productName: formData.productName,
                  duration: formData.duration,
                }),
              }
            );

            const data = await response.json();

            if (!data.success) {
              console.warn(`⚠️ Failed to adapt concept ${concept.id}:`, data.error);
              // Return original concept if adaptation fails
              return concept;
            }

            console.log(`✅ Adapted concept "${concept.tagline}" to ${newSceneCount} scenes`);
            return {
              ...concept,
              sceneBreakdown: data.adaptedScenes,
            };
          } catch (err) {
            console.error(`❌ Error adapting concept ${concept.id}:`, err);
            return concept; // Return original on error
          }
        })
      );

      setConcepts(adaptedConcepts);
      setInitialSceneCount(newSceneCount);
      console.log('✅ All concepts adapted successfully');
    } catch (err) {
      console.error('❌ Error during scene adaptation:', err);
    } finally {
      setIsAdaptingScenes(false);
    }
  };

  const generateImageConcepts = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🖼️ Generating 3 concept images...');

      const response = await fetch(
        'https://us-central1-vid-ad.cloudfunctions.net/generateScenes',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            formData: {
              productName: formData.productName,
              productDescription: formData.productDescription,
              keywords: formData.keywords,
              brandTone: formData.brandTone,
              primaryColor: formData.primaryColor,
              targetAudience: formData.targetAudience,
              callToAction: formData.callToAction,
              orientation: formData.orientation,
              duration: formData.duration,
            },
            numberOfScenes: 3, // Generate 3 concept images for selection
          }),
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate concept images');
      }

      // Transform scene images to image concepts
      const imageConceptsData: ImageConcept[] = data.images.map((img: any) => ({
        id: img.id,
        url: img.url,
        prompt: img.prompt,
        videoPrompt: img.videoPrompt,
        description: img.description || `Concept ${img.sceneNumber}`,
      }));

      setImageConcepts(imageConceptsData);
      console.log('✅ Generated image concepts:', imageConceptsData);
    } catch (err) {
      console.error('❌ Error generating image concepts:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate concept images');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle image upload
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setUploadedImageUrl(url);

    // Generate video prompt for uploaded image
    setIsGeneratingUploadPrompt(true);
    try {
      // TODO: Call API to generate video prompt from image
      // For now, use a placeholder
      setUploadedVideoPrompt('Slow zoom in with gentle camera movement, highlighting key features');
    } catch (err) {
      console.error('Failed to generate video prompt:', err);
    } finally {
      setIsGeneratingUploadPrompt(false);
    }
  };

  // Handle editing image prompt
  const handleEditPrompt = (conceptId: string, currentPrompt: string) => {
    setEditingPromptId(conceptId);
    setEditedPrompts({ ...editedPrompts, [conceptId]: currentPrompt });
  };

  // Handle saving edited prompt and regenerating image
  const handleSavePrompt = async (conceptId: string) => {
    const newPrompt = editedPrompts[conceptId];
    if (!newPrompt) return;

    setRegeneratingImageId(conceptId);
    try {
      console.log(`🔄 Regenerating image ${conceptId} with new prompt:`, newPrompt);

      const response = await fetch(
        'https://us-central1-vid-ad.cloudfunctions.net/regenerateScene',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            originalPrompt: newPrompt,
            sceneNumber: parseInt(conceptId.replace('scene-', '')),
            customPrompt: newPrompt,
          }),
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to regenerate image');
      }

      // Update the image concept with new URL
      setImageConcepts(prev => prev.map(concept =>
        concept.id === conceptId
          ? { ...concept, url: data.image.url, prompt: newPrompt }
          : concept
      ));

      setEditingPromptId(null);
      console.log('✅ Image regenerated successfully');
    } catch (err) {
      console.error('❌ Error regenerating image:', err);
      alert('Failed to regenerate image. Please try again.');
    } finally {
      setRegeneratingImageId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[500px] flex items-center justify-center">
        <div className="text-center max-w-2xl">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-6"></div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">
            {isImageToVideo ? 'Generating Concept Images...' : 'Crafting Creative Concepts...'}
          </h3>
          <p className="text-gray-600">
            {isImageToVideo
              ? `Our AI is generating 3 concept images for "${formData.productName}"`
              : `Our AI is generating 3 unique concepts for "${formData.productName}"`}
          </p>
          {creativeDirection && (
            <div className="mt-4 bg-purple-50 rounded-lg p-4 text-left">
              <p className="text-sm font-semibold text-purple-900 mb-1">Your Creative Direction:</p>
              <p className="text-sm text-purple-700 italic">"{creativeDirection}"</p>
            </div>
          )}
          <p className="text-sm text-gray-500 mt-2">
            {isImageToVideo ? 'This will take about 15-25 seconds' : 'This will take about 10-15 seconds'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[500px] flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">
            Generation Failed
          </h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={isImageToVideo ? generateImageConcepts : generateConcepts}
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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Select Your Creative Concept
        </h2>
        <p className="text-gray-600">
          Choose the concept that best captures your vision for "{formData.productName}"
        </p>
      </div>

      {/* Workflow 1: Image-to-Video - Show Upload + AI-Generated Concepts */}
      {isImageToVideo && (
        <>
          {/* Upload Section */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border-2 border-blue-200 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">📤 Upload Your Own Image</h3>
            <p className="text-sm text-gray-600 mb-4">
              Upload an image and we'll generate a video prompt for you automatically
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer"
            />

            {uploadedImageUrl && (
              <div className="mt-4 bg-white rounded-lg p-4 border border-gray-200">
                <div className="grid grid-cols-2 gap-4">
                  <img src={uploadedImageUrl} alt="Uploaded" className="w-full h-48 object-cover rounded-lg" />
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">📹 Video Prompt:</p>
                    {isGeneratingUploadPrompt ? (
                      <p className="text-sm text-gray-500 italic">Generating prompt...</p>
                    ) : (
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded border">{uploadedVideoPrompt}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* AI-Generated Concepts */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">🤖 AI-Generated Concepts</h3>
            {imageConcepts.map((concept) => (
              <div
                key={concept.id}
                onClick={() => onSelectConcept(concept)}
                className={`
                  border-2 rounded-xl p-4 cursor-pointer transition-all
                  ${
                    selectedConcept?.id === concept.id
                      ? 'border-purple-600 bg-purple-50 shadow-lg'
                      : 'border-gray-200 hover:border-purple-300 hover:shadow-md bg-white'
                  }
                `}
              >
                <div className="grid grid-cols-3 gap-4">
                  {/* Image */}
                  <div className="relative">
                    <img
                      src={concept.url}
                      alt={concept.description || `Concept ${concept.id}`}
                      className="w-full aspect-[9/16] object-cover rounded-lg"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect width="400" height="300" fill="%23f3f4f6"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="16" fill="%239ca3af"%3EImage unavailable%3C/text%3E%3C/svg%3E';
                      }}
                    />
                    {selectedConcept?.id === concept.id && (
                      <div className="absolute top-2 right-2 bg-purple-600 text-white p-2 rounded-full">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Prompts */}
                  <div className="col-span-2 space-y-4">
                    {/* Image Prompt (Editable) */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-gray-700">🎨 Image Generation Prompt:</p>
                        {editingPromptId !== concept.id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditPrompt(concept.id, concept.prompt);
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            ✏️ Edit
                          </button>
                        )}
                      </div>
                      {editingPromptId === concept.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editedPrompts[concept.id] || ''}
                            onChange={(e) => setEditedPrompts({ ...editedPrompts, [concept.id]: e.target.value })}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full text-sm p-2 border border-gray-300 rounded resize-none"
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSavePrompt(concept.id);
                              }}
                              disabled={regeneratingImageId === concept.id}
                              className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                            >
                              {regeneratingImageId === concept.id ? '🔄 Regenerating...' : '✅ Save & Regenerate'}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingPromptId(null);
                              }}
                              className="text-xs px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded border">{concept.prompt}</p>
                      )}
                    </div>

                    {/* Video Prompt (Read-only) */}
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-2">📹 Video Generation Prompt:</p>
                      <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded border border-blue-200">
                        {concept.videoPrompt || 'Gentle camera movement with smooth transitions'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {selectedConcept && (
            <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-sm text-purple-900">
                <strong>Selected:</strong> {(selectedConcept as ImageConcept).description} - Click "Next" to configure video settings
              </p>
            </div>
          )}
        </>
      )}

      {/* Workflow 2: Text-to-Video - Show Narrative Concepts */}
      {!isImageToVideo && (
        <>
          {/* Number of Scenes Selection */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border-2 border-purple-200">
            <label className="block mb-4">
              <span className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                🎬 Number of Scenes
              </span>
              <span className="text-sm text-gray-600 mt-1 block">
                Choose how many scenes you want to generate for your video storyboard
              </span>
            </label>

            <div className="flex items-center gap-6">
              {/* Number Input */}
              <div className="flex-1">
                <input
                  type="range"
                  min="3"
                  max="10"
                  value={numberOfScenes}
                  onChange={(e) => onNumberOfScenesChange(parseInt(e.target.value))}
                  className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>3 scenes</span>
                  <span>10 scenes</span>
                </div>
              </div>

              {/* Display Value */}
              <div className="flex-shrink-0 bg-white rounded-lg px-6 py-3 border-2 border-purple-600 shadow-lg">
                <div className="text-3xl font-bold text-purple-600 text-center">
                  {numberOfScenes}
                </div>
                <div className="text-xs text-gray-600 text-center mt-1">
                  scenes
                </div>
              </div>
            </div>

            {/* Quick Select Buttons */}
            <div className="flex gap-2 mt-4">
              <span className="text-sm text-gray-600 flex items-center">Quick select:</span>
              {[3, 5, 7, 10].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => onNumberOfScenesChange(num)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    numberOfScenes === num
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>

            {/* Info text */}
            <p className="text-xs text-gray-500 mt-3">
              💡 Tip: More scenes = more detailed story, but longer generation time (~2-3 seconds per scene)
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {concepts.map((concept) => (
              <div
                key={concept.id}
                onClick={() => onSelectConcept(concept)}
                className={`
                  relative p-6 rounded-xl border-2 cursor-pointer transition-all
                  ${
                    selectedConcept?.id === concept.id
                      ? 'border-purple-600 bg-purple-50 shadow-lg scale-105'
                      : 'border-gray-200 hover:border-purple-300 hover:shadow-md'
                  }
                `}
              >
                {/* Selection Indicator */}
                {selectedConcept?.id === concept.id && (
                  <div className="absolute top-4 right-4 bg-purple-600 text-white p-2 rounded-full">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Tagline */}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      {concept.tagline}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span className="px-2 py-1 bg-gray-100 rounded">
                        {concept.targetEmotion}
                      </span>
                    </div>
                  </div>

                  {/* Narrative Arc */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-1">
                      Narrative Arc
                    </h4>
                    <p className="text-sm text-gray-600">{concept.narrativeArc}</p>
                  </div>

                  {/* Visual Style */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-1">
                      Visual Style
                    </h4>
                    <p className="text-sm text-gray-600">{concept.visualStyle}</p>
                  </div>

                  {/* Scene Breakdown */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-1">
                      Scene Flow ({concept.sceneBreakdown.length} scenes)
                    </h4>
                    <ul className="space-y-1">
                      {concept.sceneBreakdown.map((scene, idx) => (
                        <li key={idx} className="text-sm text-gray-600 flex items-start">
                          <span className="inline-block w-5 h-5 rounded-full bg-purple-100 text-purple-600 text-xs flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                            {idx + 1}
                          </span>
                          <span>{scene}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {selectedConcept && (
            <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-sm text-purple-900">
                <strong>Selected:</strong> {(selectedConcept as Concept).tagline} - Click "Next" to
                generate your storyboard
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { AdGenerationFormData } from '@/lib/schemas/adGenerationSchema';

interface Concept {
  id: string;
  tagline: string;
  narrativeArc: string;
  visualStyle: string;
  targetEmotion: string;
  sceneBreakdown: string[];
}

interface ConceptSelectionStepProps {
  formData: AdGenerationFormData;
  creativeDirection: string;
  selectedConcept: Concept | null;
  onSelectConcept: (concept: Concept) => void;
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    generateConcepts();
  }, []);

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
      console.log('✅ Generated concepts:', data.concepts);
    } catch (err) {
      console.error('❌ Error generating concepts:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate concepts');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[500px] flex items-center justify-center">
        <div className="text-center max-w-2xl">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-6"></div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">
            Crafting Creative Concepts...
          </h3>
          <p className="text-gray-600">
            Our AI is generating 3 unique concepts for "{formData.productName}"
          </p>
          {creativeDirection && (
            <div className="mt-4 bg-purple-50 rounded-lg p-4 text-left">
              <p className="text-sm font-semibold text-purple-900 mb-1">Your Creative Direction:</p>
              <p className="text-sm text-purple-700 italic">"{creativeDirection}"</p>
            </div>
          )}
          <p className="text-sm text-gray-500 mt-2">This will take about 10-15 seconds</p>
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
            onClick={generateConcepts}
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
            <strong>Selected:</strong> {selectedConcept.tagline} - Click "Next" to
            generate your storyboard
          </p>
        </div>
      )}
    </div>
  );
}

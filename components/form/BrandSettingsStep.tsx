'use client';

import { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { AdGenerationFormData, BrandTone } from '@/lib/schemas/adGenerationSchema';

interface BrandSettingsStepProps {
  form: UseFormReturn<AdGenerationFormData>;
}

const brandToneOptions = [
  { value: BrandTone.PROFESSIONAL, label: 'Professional', description: 'Clean, corporate, trustworthy' },
  { value: BrandTone.CASUAL, label: 'Casual', description: 'Friendly, approachable, relaxed' },
  { value: BrandTone.PLAYFUL, label: 'Playful', description: 'Fun, energetic, creative' },
  { value: BrandTone.LUXURY, label: 'Luxury', description: 'Elegant, premium, sophisticated' },
  { value: BrandTone.ENERGETIC, label: 'Energetic', description: 'Dynamic, exciting, bold' },
  { value: BrandTone.MINIMALIST, label: 'Minimalist', description: 'Simple, clean, modern' },
];

export default function BrandSettingsStep({ form }: BrandSettingsStepProps) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const selectedTone = watch('brandTone');
  const primaryColor = watch('primaryColor');
  const productName = watch('productName');
  const productDescription = watch('productDescription');

  const [isGeneratingLogo, setIsGeneratingLogo] = useState(false);
  const [generatedLogoUrl, _setGeneratedLogoUrl] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  const handleGenerateLogo = async () => {
    setIsGeneratingLogo(true);
    setLogoError(null);

    try {
      // Create a prompt for logo generation based on form data
      const logoPrompt = `Create a professional logo for "${productName}". ${productDescription}. Brand tone: ${selectedTone}. Primary color: ${primaryColor}. Style: modern, clean, simple, suitable for a brand logo.`;

      // TODO: Integrate with actual AI logo generation service (e.g., DALL-E, Midjourney, or "nano banana")
      // For now, we'll simulate the API call
      console.log('Generating logo with prompt:', logoPrompt);

      // Simulated API call - replace with actual AI service
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Placeholder: In production, this would be the URL returned from the AI service
      // Example: const response = await fetch('/api/generate-logo', { method: 'POST', body: JSON.stringify({ prompt: logoPrompt }) });
      // const data = await response.json();
      // setGeneratedLogoUrl(data.imageUrl);

      // For now, show a message that the feature is coming soon
      setLogoError('AI Logo Generation coming soon! This will generate a logo based on your product info and brand settings.');
    } catch (error) {
      console.error('Error generating logo:', error);
      setLogoError('Failed to generate logo. Please try again or upload your own logo.');
    } finally {
      setIsGeneratingLogo(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Brand Settings</h2>
        <p className="text-gray-600">Define your brand's visual style and tone</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Brand Tone *
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {brandToneOptions.map((option) => (
              <label
                key={option.value}
                className={`relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedTone === option.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  {...register('brandTone')}
                  value={option.value}
                  className="sr-only"
                />
                <span className="text-sm font-medium text-gray-900">{option.label}</span>
                <span className="text-xs text-gray-500 mt-1">{option.description}</span>
                {selectedTone === option.value && (
                  <div className="absolute top-2 right-2">
                    <svg
                      className="w-5 h-5 text-blue-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </label>
            ))}
          </div>
          {errors.brandTone && (
            <p className="mt-2 text-sm text-red-600">{errors.brandTone.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="primaryColor" className="block text-sm font-medium text-gray-700 mb-2">
            Primary Brand Color *
          </label>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="flex items-center">
                <input
                  type="color"
                  id="primaryColor"
                  {...register('primaryColor')}
                  className="h-12 w-12 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setValue('primaryColor', e.target.value)}
                  placeholder="#000000"
                  className={`ml-3 flex-1 px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                    errors.primaryColor ? 'border-red-500' : 'border-gray-300'
                  }`}
                  pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                />
              </div>
            </div>
            <div
              className="w-20 h-12 rounded-lg border-2 border-gray-300"
              style={{ backgroundColor: primaryColor }}
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Choose a color that represents your brand
          </p>
          {errors.primaryColor && (
            <p className="mt-1 text-sm text-red-600">{errors.primaryColor.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Logo Upload (Optional)
          </label>

          {/* AI Logo Generation Button */}
          <div className="mb-4">
            <button
              type="button"
              onClick={handleGenerateLogo}
              disabled={isGeneratingLogo || !productName || !selectedTone}
              className="w-full inline-flex items-center justify-center px-4 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-[#41b6e6] to-[#3aa5d5] hover:from-[#3aa5d5] hover:to-[#2994c4] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#41b6e6] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isGeneratingLogo ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating Logo...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Generate Logo with AI
                </>
              )}
            </button>
            {!productName || !selectedTone ? (
              <p className="mt-2 text-xs text-[#5b6068] text-center">
                Please fill in Product Info and select a Brand Tone first
              </p>
            ) : null}
          </div>

          {/* Generated Logo Preview */}
          {generatedLogoUrl && (
            <div className="mb-4 p-4 border-2 border-[#41b6e6] rounded-lg bg-blue-50">
              <p className="text-sm font-medium text-[#111827] mb-2">Generated Logo</p>
              <img src={generatedLogoUrl} alt="Generated logo" className="max-h-32 mx-auto" />
              <div className="mt-3 flex justify-center space-x-2">
                <button
                  type="button"
                  className="px-3 py-1 text-xs font-medium text-[#41b6e6] border border-[#41b6e6] rounded hover:bg-blue-50 transition-colors"
                  onClick={handleGenerateLogo}
                >
                  Regenerate
                </button>
                <button
                  type="button"
                  className="px-3 py-1 text-xs font-medium text-white bg-[#41b6e6] rounded hover:bg-[#3aa5d5] transition-colors"
                >
                  Use This Logo
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {logoError && (
            <div className="mb-4 p-3 border border-blue-200 rounded-lg bg-blue-50">
              <p className="text-sm text-[#111827]">{logoError}</p>
            </div>
          )}

          {/* Manual Upload */}
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
            <div className="space-y-1 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="flex text-sm text-gray-600">
                <label
                  htmlFor="logoFile"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-[#41b6e6] hover:text-[#3aa5d5] focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[#41b6e6]"
                >
                  <span>Upload a file</span>
                  <input
                    id="logoFile"
                    type="file"
                    {...register('logoFile')}
                    className="sr-only"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">PNG, JPG, GIF, WebP up to 5MB</p>
            </div>
          </div>
          {errors.logoFile && (
            <p className="mt-1 text-sm text-red-600">{errors.logoFile.message as string}</p>
          )}
        </div>

        <div>
          <label htmlFor="callToAction" className="block text-sm font-medium text-gray-700 mb-1">
            Call to Action (Optional)
          </label>
          <input
            type="text"
            id="callToAction"
            {...register('callToAction')}
            className={`w-full px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none ${
              errors.callToAction ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="e.g., Shop Now, Learn More, Get Started"
            maxLength={50}
          />
          <p className="mt-1 text-xs text-gray-500">
            Text for the action button in your ad
          </p>
          {errors.callToAction && (
            <p className="mt-1 text-sm text-red-600">{errors.callToAction.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
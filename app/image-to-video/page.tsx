'use client';

import { useState, useRef } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase/config';

export default function ImageToVideoPage() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [duration, setDuration] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleGenerate = async () => {
    if (!imageFile || !prompt) {
      setError('Please upload an image and enter a prompt');
      return;
    }

    setIsGenerating(true);
    setError('');
    setVideoUrl('');
    setStatus('Uploading image...');

    try {
      // Convert file to base64 for upload
      const reader = new FileReader();
      const fileDataPromise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });

      const fileData = await fileDataPromise;
      console.log('📤 File read as data URL');

      // Upload to S3 via Firebase function
      const uploadFn = httpsCallable(functions, 'uploadImageToS3');
      const uploadResult = await uploadFn({
        fileData,
        fileName: imageFile.name,
        path: `image-to-video/${Date.now()}-${imageFile.name}`,
      });

      const uploadData = uploadResult.data as any;
      const imageUrl = uploadData.url;
      console.log('✅ Image uploaded to S3:', imageUrl);

      setStatus('Starting video generation...');

      // Call Firebase function to generate video
      const generateFn = httpsCallable(functions, 'generateImageToVideo');
      const result = await generateFn({
        imageUrl,
        prompt,
        negativePrompt: negativePrompt || undefined,
        duration,
        aspectRatio: '9:16',
      });

      const data = result.data as any;
      console.log('🎬 Video generation started:', data);

      if (!data.success) {
        throw new Error(data.message || 'Failed to start video generation');
      }

      const videoId = data.videoId;
      setStatus('Generating video... This may take 2-3 minutes');

      // Poll for video completion
      const checkStatusFn = httpsCallable(functions, 'checkImageToVideoStatus');
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes max (5s intervals)

      const pollInterval = setInterval(async () => {
        try {
          attempts++;
          console.log(`📊 Checking status (attempt ${attempts}/${maxAttempts})...`);

          const statusResult = await checkStatusFn({ videoId });
          const statusData = statusResult.data as any;

          console.log('📊 Status:', statusData.status);

          if (statusData.status === 'succeeded') {
            clearInterval(pollInterval);
            setVideoUrl(statusData.output);
            setStatus('Video generated successfully!');
            setIsGenerating(false);
          } else if (statusData.status === 'failed' || statusData.status === 'error') {
            clearInterval(pollInterval);
            setError(`Video generation failed: ${statusData.error || 'Unknown error'}`);
            setIsGenerating(false);
          } else if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            setError('Video generation timed out. Please try again.');
            setIsGenerating(false);
          } else {
            setStatus(`Generating video... Status: ${statusData.status}`);
          }
        } catch (pollError: any) {
          console.error('❌ Error polling status:', pollError);
          clearInterval(pollInterval);
          setError(`Error checking status: ${pollError.message}`);
          setIsGenerating(false);
        }
      }, 5000); // Check every 5 seconds

    } catch (err: any) {
      console.error('❌ Error generating video:', err);
      setError(err.message || 'Failed to generate video');
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Image to Video
          </h1>
          <p className="text-xl text-gray-600">
            Transform your image into a dynamic video with AI
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-8">
          {/* Image Upload */}
          <div>
            <label className="block text-lg font-semibold text-gray-900 mb-4">
              1. Upload Image
            </label>

            {!imagePreview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-all"
              >
                <div className="text-6xl mb-4">🖼️</div>
                <p className="text-lg font-medium text-gray-700 mb-2">
                  Click to upload or drag and drop
                </p>
                <p className="text-sm text-gray-500">
                  PNG, JPG, or WEBP • Max 10MB
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full max-h-96 object-contain rounded-lg border-2 border-gray-200"
                />
                <button
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview('');
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="text-red-600 hover:text-red-700 font-medium"
                >
                  Remove Image
                </button>
              </div>
            )}
          </div>

          {/* Prompt Input */}
          <div>
            <label className="block text-lg font-semibold text-gray-900 mb-4">
              2. Describe the Video Motion
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Camera slowly zooms in while the woman smiles and waves. Smooth cinematic motion with soft lighting."
              className="w-full h-32 px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none resize-none"
            />
            <p className="text-sm text-gray-500 mt-2">
              Describe how you want the image to animate and move
            </p>
          </div>

          {/* Negative Prompt (Optional) */}
          <div>
            <label className="block text-lg font-semibold text-gray-900 mb-4">
              3. Negative Prompt (Optional)
            </label>
            <textarea
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="e.g., blurry, distorted, low quality, watermark"
              className="w-full h-24 px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none resize-none"
            />
            <p className="text-sm text-gray-500 mt-2">
              Things you don't want to see in the video
            </p>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-lg font-semibold text-gray-900 mb-4">
              4. Video Duration
            </label>
            <div className="flex gap-4">
              <button
                onClick={() => setDuration(5)}
                className={`flex-1 py-4 rounded-lg font-semibold transition-all ${
                  duration === 5
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                5 Seconds
              </button>
              <button
                onClick={() => setDuration(10)}
                className={`flex-1 py-4 rounded-lg font-semibold transition-all ${
                  duration === 10
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                10 Seconds
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Cost: ${(duration * 0.07).toFixed(2)} per video
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-medium">{error}</p>
            </div>
          )}

          {/* Status Message */}
          {status && !error && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 font-medium">{status}</p>
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !imageFile || !prompt}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {isGenerating ? 'Generating Video...' : 'Generate Video'}
          </button>

          {/* Video Result */}
          {videoUrl && (
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-gray-900">Your Video</h3>
              <video
                src={videoUrl}
                controls
                autoPlay
                loop
                className="w-full rounded-lg shadow-lg"
              />
              <a
                href={videoUrl}
                download="generated-video.mp4"
                className="block w-full py-3 bg-green-600 text-white rounded-lg font-semibold text-center hover:bg-green-700 transition-colors"
              >
                Download Video
              </a>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="mt-12 bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">How It Works</h2>
          <div className="space-y-4 text-gray-700">
            <div className="flex gap-4">
              <div className="text-3xl">🎨</div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Upload Your Image</h3>
                <p>Start with any image - product photos, portraits, landscapes, or artwork.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-3xl">✨</div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Describe the Motion</h3>
                <p>Tell AI how you want the image to animate - camera movements, actions, and effects.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-3xl">🎬</div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Get Your Video</h3>
                <p>AI generates a professional video with smooth motion and cinematic quality.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

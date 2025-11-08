'use client';

import { useState, useCallback, useRef } from 'react';
import { processLogo, ProcessedLogo, LogoSettings } from '@/lib/logoProcessor';
import { generateLogoPreview } from '@/lib/services/imageCompositor';

interface LogoUploaderProps {
  onLogoProcessed: (logo: ProcessedLogo, settings: LogoSettings) => void;
  initialLogo?: ProcessedLogo;
  initialSettings?: LogoSettings;
}

export default function LogoUploader({
  onLogoProcessed,
  initialLogo,
  initialSettings,
}: LogoUploaderProps) {
  const [logo, setLogo] = useState<ProcessedLogo | null>(initialLogo || null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const [settings, setSettings] = useState<LogoSettings>(initialSettings || {
    placement: 'bottom-right',
    scale: 0.2,
    opacity: 1.0,
    padding: 20,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setIsProcessing(true);

    try {
      console.log('📤 Processing logo:', file.name);
      const processed = await processLogo(file);
      setLogo(processed);

      // Generate preview
      await updatePreview(processed.cleanUrl, settings);

      // Notify parent
      onLogoProcessed(processed, settings);

    } catch (error) {
      console.error('❌ Error processing logo:', error);
      alert(error instanceof Error ? error.message : 'Failed to process logo');
    } finally {
      setIsProcessing(false);
    }
  };

  const updatePreview = async (logoUrl: string, newSettings: LogoSettings) => {
    try {
      const preview = await generateLogoPreview(
        logoUrl,
        newSettings.placement,
        newSettings.scale
      );
      setPreviewUrl(preview);
    } catch (error) {
      console.error('Failed to generate preview:', error);
    }
  };

  const updateSettings = async (updates: Partial<LogoSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);

    if (logo) {
      await updatePreview(logo.cleanUrl, newSettings);
      onLogoProcessed(logo, newSettings);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const positions = [
    { value: 'top-left', label: 'Top Left', icon: '↖️' },
    { value: 'top-center', label: 'Top Center', icon: '⬆️' },
    { value: 'top-right', label: 'Top Right', icon: '↗️' },
    { value: 'center-left', label: 'Left', icon: '⬅️' },
    { value: 'center', label: 'Center', icon: '🎯' },
    { value: 'center-right', label: 'Right', icon: '➡️' },
    { value: 'bottom-left', label: 'Bottom Left', icon: '↙️' },
    { value: 'bottom-center', label: 'Bottom Center', icon: '⬇️' },
    { value: 'bottom-right', label: 'Bottom Right', icon: '↘️' },
  ];

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      {!logo && (
        <div
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
            dragActive
              ? 'border-purple-500 bg-purple-50 scale-105'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {isProcessing ? (
            <div className="space-y-4">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto"></div>
              <div>
                <p className="text-lg font-semibold text-gray-700">Processing Logo...</p>
                <p className="text-sm text-gray-500 mt-2">
                  Removing background & optimizing
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-7xl">🎨</div>
              <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  Upload Your Logo
                </h3>
                <p className="text-gray-600 mb-1">
                  We'll add it consistently to all your video scenes
                </p>
                <p className="text-sm text-gray-500">
                  Drag and drop or click to browse
                </p>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold text-lg hover:opacity-90 transition-opacity shadow-lg"
                >
                  Choose Logo File
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                  onChange={handleChange}
                  className="hidden"
                />
                <p className="text-xs text-gray-400">
                  PNG, JPG, or SVG • Max 10MB
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Logo Settings */}
      {logo && (
        <div className="space-y-6">
          {/* Preview Grid */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Logo Preview
            </h3>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Original Upload
                </p>
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={logo.originalUrl}
                    alt="Original logo"
                    className="w-full h-full object-contain p-4"
                  />
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Processed (Background Removed)
                </p>
                <div
                  className="aspect-square rounded-lg overflow-hidden"
                  style={{
                    backgroundImage: 'linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)',
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                  }}
                >
                  <img
                    src={logo.cleanUrl}
                    alt="Processed logo"
                    className="w-full h-full object-contain p-4"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
              <span>
                {logo.dimensions.width} × {logo.dimensions.height}px
              </span>
              <span>
                {(logo.fileSize / 1024).toFixed(1)} KB
              </span>
              <button
                onClick={() => {
                  setLogo(null);
                  setPreviewUrl('');
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                className="text-red-600 hover:text-red-700 font-medium"
              >
                Remove & Upload Different
              </button>
            </div>
          </div>

          {/* Placement Settings */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              Logo Placement Settings
            </h3>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Position on Scene
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {positions.map((pos) => (
                    <button
                      key={pos.value}
                      onClick={() => updateSettings({ placement: pos.value as any })}
                      className={`p-4 border-2 rounded-lg transition-all ${
                        settings.placement === pos.value
                          ? 'border-purple-600 bg-purple-50 shadow-md'
                          : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                      }`}
                    >
                      <div className="text-2xl mb-1">{pos.icon}</div>
                      <div className="text-xs font-medium text-gray-700">
                        {pos.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Logo Size: {Math.round(settings.scale * 100)}%
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="0.5"
                  step="0.05"
                  value={settings.scale}
                  onChange={(e) => updateSettings({ scale: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>Small (10%)</span>
                  <span>Medium (30%)</span>
                  <span>Large (50%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Live Preview */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Preview on Video Scene
            </h3>

            <div className="aspect-[9/16] max-w-md mx-auto rounded-lg overflow-hidden shadow-xl">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Logo preview on scene"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                  <p className="text-gray-500">Generating preview...</p>
                </div>
              )}
            </div>

            <p className="text-sm text-gray-600 text-center mt-4">
              This is how your logo will appear in every scene
            </p>
          </div>

          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="text-2xl">ℹ️</div>
              <div className="flex-1">
                <h4 className="font-semibold text-blue-900 mb-1">
                  Logo Consistency Guarantee
                </h4>
                <p className="text-sm text-blue-800">
                  Your logo will appear in the exact same position with the exact same appearance in all generated scenes and videos.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

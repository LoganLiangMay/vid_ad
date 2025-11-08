/**
 * Logo Processing Utilities
 * Handles upload, validation, background removal, and optimization
 */

export interface ProcessedLogo {
  id: string;
  originalUrl: string;      // Original uploaded image
  cleanUrl: string;          // Background removed version
  thumbnail: string;         // Small preview (200x200)
  dimensions: {
    width: number;
    height: number;
  };
  format: 'png' | 'jpg' | 'svg';
  hasTransparency: boolean;
  fileSize: number;          // In bytes
  processedAt: number;       // Timestamp
}

export interface LogoSettings {
  placement: 'top-left' | 'top-center' | 'top-right' |
             'center-left' | 'center' | 'center-right' |
             'bottom-left' | 'bottom-center' | 'bottom-right';
  scale: number;             // 0.1 to 1.0
  opacity: number;           // 0 to 1.0
  padding: number;           // Pixels from edge
}

/**
 * Main processing function
 * 1. Validates file
 * 2. Removes background
 * 3. Optimizes size
 * 4. Generates metadata
 */
export async function processLogo(file: File): Promise<ProcessedLogo> {
  console.log('📤 Processing logo:', file.name);

  // Validate file type and size
  validateLogoFile(file);

  // Convert to data URL for processing
  const originalUrl = await fileToDataURL(file);

  // Remove background using Replicate
  console.log('🎭 Removing background...');
  const cleanUrl = await removeBackgroundClient(originalUrl);

  // Get image dimensions
  const dimensions = await getImageDimensions(cleanUrl);

  // Generate thumbnail
  const thumbnail = await generateThumbnail(cleanUrl, 200, 200);

  console.log('✅ Logo processed successfully');

  return {
    id: `logo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    originalUrl,
    cleanUrl,
    thumbnail,
    dimensions,
    format: getImageFormat(file),
    hasTransparency: file.type === 'image/png',
    fileSize: file.size,
    processedAt: Date.now(),
  };
}

function validateLogoFile(file: File): void {
  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
  if (!validTypes.includes(file.type)) {
    throw new Error('Logo must be PNG, JPG, or SVG format');
  }

  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new Error('Logo file size must be under 10MB');
  }
}

function getImageFormat(file: File): 'png' | 'jpg' | 'svg' {
  if (file.type === 'image/svg+xml') return 'svg';
  if (file.type === 'image/png') return 'png';
  return 'jpg';
}

function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function getImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}

async function generateThumbnail(
  url: string,
  maxWidth: number,
  maxHeight: number
): Promise<string> {
  const img = await loadImage(url);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('Canvas context not available');

  // Calculate dimensions maintaining aspect ratio
  const scale = Math.min(maxWidth / img.width, maxHeight / img.height);
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;

  // Draw scaled image
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL('image/png');
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}

/**
 * Remove background from logo image (client-side API call)
 * Returns transparent PNG with logo only
 */
async function removeBackgroundClient(imageUrl: string): Promise<string> {
  try {
    console.log('🎭 Calling background removal API...');

    // Call Firebase function that handles Replicate API
    const { httpsCallable } = await import('firebase/functions');
    const { functions } = await import('@/lib/firebase/config');

    const removeBackgroundFn = httpsCallable(functions, 'removeBackgroundFromLogo');

    const result = await removeBackgroundFn({ imageUrl });
    const data = result.data as any;

    if (!data.success) {
      throw new Error(data.error || 'Background removal failed');
    }

    console.log('✅ Background removed successfully');
    return data.cleanUrl;

  } catch (error) {
    console.error('❌ Background removal failed:', error);

    // Fallback: Return original image if removal fails
    // User can still use it, just with background
    console.warn('⚠️ Using original image as fallback');
    return imageUrl;
  }
}

/**
 * Check if background removal is needed
 * Returns true if image already has transparency
 */
export async function hasTransparentBackground(imageUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(false);
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Check corners and edges for transparency
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Sample pixels at corners
      const corners = [
        0, // Top-left
        (canvas.width - 1) * 4, // Top-right
        (canvas.height - 1) * canvas.width * 4, // Bottom-left
        ((canvas.height - 1) * canvas.width + canvas.width - 1) * 4 // Bottom-right
      ];

      const hasAlpha = corners.some(i => data[i + 3]! < 255);
      resolve(hasAlpha);
    };

    img.onerror = () => resolve(false);
    img.src = imageUrl;
  });
}

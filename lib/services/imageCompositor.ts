/**
 * Image Compositor Service
 * Composites logo onto scene backgrounds
 */

export interface CompositeOptions {
  logoUrl: string;
  sceneUrl: string;
  placement: 'top-left' | 'top-center' | 'top-right' |
             'center-left' | 'center' | 'center-right' |
             'bottom-left' | 'bottom-center' | 'bottom-right';
  scale: number;      // 0.1 to 1.0
  opacity: number;    // 0 to 1.0
  padding: number;    // Pixels from edge
}

/**
 * Composite logo onto single scene
 * Returns new image as data URL with logo overlaid
 */
export async function compositeLogoOntoScene(
  options: CompositeOptions
): Promise<string> {
  const {
    logoUrl,
    sceneUrl,
    placement = 'bottom-right',
    scale = 0.2,
    opacity = 1.0,
    padding = 20,
  } = options;

  console.log(`🎨 Compositing logo (${placement}, ${Math.round(scale * 100)}%)...`);

  // Load both images in parallel
  const [logo, scene] = await Promise.all([
    loadImage(logoUrl),
    loadImage(sceneUrl),
  ]);

  // Create canvas matching scene dimensions
  const canvas = document.createElement('canvas');
  canvas.width = scene.width;
  canvas.height = scene.height;
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('Canvas context not available');

  // Draw scene background
  ctx.drawImage(scene, 0, 0);

  // Calculate logo dimensions (maintain aspect ratio)
  const logoWidth = logo.width * scale;
  const logoHeight = logo.height * scale;

  // Calculate position based on placement
  const position = calculatePosition(
    placement,
    scene.width,
    scene.height,
    logoWidth,
    logoHeight,
    padding
  );

  // Draw logo with opacity
  ctx.globalAlpha = opacity;
  ctx.drawImage(logo, position.x, position.y, logoWidth, logoHeight);
  ctx.globalAlpha = 1.0;

  console.log(`✅ Logo composited at (${position.x}, ${position.y})`);

  // Return as PNG data URL
  return canvas.toDataURL('image/png', 1.0);
}

/**
 * Calculate logo position based on placement option
 */
function calculatePosition(
  placement: string,
  sceneWidth: number,
  sceneHeight: number,
  logoWidth: number,
  logoHeight: number,
  padding: number
): { x: number; y: number } {
  switch (placement) {
    case 'top-left':
      return { x: padding, y: padding };

    case 'top-center':
      return {
        x: (sceneWidth - logoWidth) / 2,
        y: padding
      };

    case 'top-right':
      return {
        x: sceneWidth - logoWidth - padding,
        y: padding
      };

    case 'center-left':
      return {
        x: padding,
        y: (sceneHeight - logoHeight) / 2
      };

    case 'center':
      return {
        x: (sceneWidth - logoWidth) / 2,
        y: (sceneHeight - logoHeight) / 2
      };

    case 'center-right':
      return {
        x: sceneWidth - logoWidth - padding,
        y: (sceneHeight - logoHeight) / 2
      };

    case 'bottom-left':
      return {
        x: padding,
        y: sceneHeight - logoHeight - padding
      };

    case 'bottom-center':
      return {
        x: (sceneWidth - logoWidth) / 2,
        y: sceneHeight - logoHeight - padding
      };

    case 'bottom-right':
    default:
      return {
        x: sceneWidth - logoWidth - padding,
        y: sceneHeight - logoHeight - padding
      };
  }
}

/**
 * Helper: Load image with CORS support
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

/**
 * Batch composite logo onto multiple scenes
 * Useful for compositing logo on all 5 generated scenes
 */
export async function batchCompositeLogos(
  scenes: string[],
  logoUrl: string,
  options: Partial<CompositeOptions>
): Promise<string[]> {
  console.log(`🎨 Batch compositing logo onto ${scenes.length} scenes...`);

  const compositePromises = scenes.map((sceneUrl) =>
    compositeLogoOntoScene({
      logoUrl,
      sceneUrl,
      placement: options.placement || 'bottom-right',
      scale: options.scale || 0.2,
      opacity: options.opacity || 1.0,
      padding: options.padding || 20,
    })
  );

  const results = await Promise.all(compositePromises);

  console.log(`✅ Batch composite complete: ${results.length} images`);
  return results;
}

/**
 * Preview logo on sample background
 * Used for real-time preview in UI
 */
export async function generateLogoPreview(
  logoUrl: string,
  placement: string,
  scale: number
): Promise<string> {
  // Create gradient sample background
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920; // 9:16 aspect ratio
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('Canvas context not available');

  // Draw gradient background
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#667eea');
  gradient.addColorStop(1, '#764ba2');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Add "Sample Scene" text
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.font = '48px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Sample Scene Background', canvas.width / 2, canvas.height / 2);

  const sampleSceneUrl = canvas.toDataURL();

  // Composite logo onto sample
  return compositeLogoOntoScene({
    logoUrl,
    sceneUrl: sampleSceneUrl,
    placement: placement as any,
    scale,
    opacity: 1.0,
    padding: 20,
  });
}

/**
 * Convert data URL to File object for S3 upload
 */
export function dataURLtoFile(dataurl: string, filename: string): File {
  const arr = dataurl.split(',');
  const mimeMatch = arr[0]?.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const bstr = atob(arr[1] || '');
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new File([u8arr], filename, { type: mime });
}

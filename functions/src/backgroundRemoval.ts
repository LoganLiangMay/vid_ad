import * as functions from 'firebase-functions/v1';
import Replicate from 'replicate';

const getReplicateClient = () => {
  const apiToken = process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY;

  if (!apiToken) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Replicate API token not configured'
    );
  }

  return new Replicate({ auth: apiToken });
};

/**
 * Remove background from logo image
 * Uses Replicate's BRIA AI background removal model
 */
export const removeBackgroundFromLogo = functions.https.onCall(async (data, _context) => {
  try {
    const { imageUrl } = data;

    if (!imageUrl) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'imageUrl is required'
      );
    }

    console.log('🎭 Removing background from logo...');

    const replicate = getReplicateClient();

    // Use rembg background removal model
    const output = await replicate.run(
      "cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003",
      {
        input: {
          image: imageUrl,
        }
      }
    );

    console.log('✅ Background removed successfully');

    // Replicate returns URL to processed image
    const cleanUrl = Array.isArray(output) ? output[0] : (output as unknown as string);

    return {
      success: true,
      cleanUrl: cleanUrl,
    };

  } catch (error: any) {
    console.error('❌ Background removal failed:', error);

    // Return error but don't fail completely - client can use original image
    return {
      success: false,
      error: error.message || 'Background removal failed',
      cleanUrl: data.imageUrl, // Fallback to original
    };
  }
});

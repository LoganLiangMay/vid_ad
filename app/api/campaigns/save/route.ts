import { NextRequest, NextResponse } from 'next/server';
import { createCampaign, addSceneImages, addVideoToCampaign } from '@/lib/firebase/campaigns';
import { uploadImageToS3, uploadVideoToS3 } from '@/lib/aws/s3';
import type { CampaignInput } from '@/lib/types/campaign';
import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('__session')?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie);
    const userId = decodedToken.uid;

    // Parse form data
    const formData = await request.formData();

    // Extract campaign data
    const campaignDataStr = formData.get('campaignData') as string;
    if (!campaignDataStr) {
      return NextResponse.json({ error: 'Campaign data is required' }, { status: 400 });
    }

    const campaignData = JSON.parse(campaignDataStr) as Omit<CampaignInput, 'userId'>;

    // Create campaign in Firestore first
    const campaign = await createCampaign({
      ...campaignData,
      userId,
      status: 'draft',
    });

    const campaignId = campaign.id;

    // Upload scene images to S3 if provided
    const sceneImageUpdates: Array<{
      sceneNumber: number;
      imageUrl: string;
      imageKey: string;
    }> = [];

    for (const [key, value] of formData.entries()) {
      if (key.startsWith('sceneImage_')) {
        const sceneNumber = parseInt(key.split('_')[1] || '0');
        const file = value as File;

        if (file && file.size > 0) {
          // Convert file to buffer
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          // Upload to S3
          const uploadResult = await uploadImageToS3(
            buffer,
            campaignId,
            file.name,
            sceneNumber
          );

          sceneImageUpdates.push({
            sceneNumber,
            imageUrl: uploadResult.url,
            imageKey: uploadResult.key,
          });
        }
      }
    }

    // Update campaign with image URLs if any were uploaded
    if (sceneImageUpdates.length > 0) {
      await addSceneImages(campaignId, sceneImageUpdates);
    }

    // Upload video to S3 if provided
    const videoFile = formData.get('video') as File | null;
    if (videoFile && videoFile.size > 0) {
      const arrayBuffer = await videoFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const uploadResult = await uploadVideoToS3(
        buffer,
        campaignId,
        videoFile.name
      );

      await addVideoToCampaign(
        campaignId,
        uploadResult.url,
        uploadResult.key
      );
    }

    return NextResponse.json({
      success: true,
      campaign: {
        ...campaign,
        id: campaignId, // Override id if it exists in campaign
      },
    });
  } catch (error: any) {
    console.error('Campaign save error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save campaign' },
      { status: 500 }
    );
  }
}

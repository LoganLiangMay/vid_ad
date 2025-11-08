import { NextRequest, NextResponse } from 'next/server';
import { getUserCampaigns, getCampaignsByStatus } from '@/lib/firebase/campaigns';
import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('__session')?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie);
    const userId = decodedToken.uid;

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as any;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam) : 50;

    // Get campaigns
    let campaigns;
    if (status) {
      campaigns = await getCampaignsByStatus(userId, status, limit);
    } else {
      campaigns = await getUserCampaigns(userId, limit);
    }

    return NextResponse.json({
      success: true,
      campaigns,
      count: campaigns.length,
    });
  } catch (error: any) {
    console.error('Get campaigns error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get campaigns' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { getUserCampaigns, getCampaignsByStatus } from '@/lib/firebase/campaigns';
import { cookies } from 'next/headers';

// Initialize Firebase Admin directly in the route
function getFirebaseAdmin() {
  try {
    if (admin.apps.length === 0) {
      admin.initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'vid-ad',
      });
    }
    return admin;
  } catch (error: any) {
    console.error('❌ [API /campaigns] Failed to initialize Firebase Admin:', error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('__session')?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const firebaseAdmin = getFirebaseAdmin();
    const decodedToken = await firebaseAdmin.auth().verifySessionCookie(sessionCookie);
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

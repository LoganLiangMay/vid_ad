import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin with singleton pattern
// This must be done in the API route itself for Firebase Cloud Functions
function getAdminAuth() {
  console.log('🔧 [Admin] Checking if admin app exists...');

  if (getApps().length === 0) {
    console.log('🔧 [Admin] No admin app found, initializing...');

    // In Firebase Cloud Functions, we can initialize without any credentials
    // Firebase will automatically use the default service account
    try {
      const app = initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'vid-ad',
      });
      console.log('✅ [Admin] Firebase Admin initialized successfully with project:', app.options.projectId);
    } catch (error: any) {
      console.error('❌ [Admin] Failed to initialize Firebase Admin:', error.message);
      throw error;
    }
  } else {
    console.log('✅ [Admin] Admin app already exists');
  }

  return getAuth();
}

export async function POST(request: NextRequest) {
  try {
    console.log('🍪 [API /auth/session] Received session creation request');
    const { idToken } = await request.json();

    if (!idToken) {
      console.log('❌ [API /auth/session] No ID token provided');
      return NextResponse.json(
        { error: 'ID token is required' },
        { status: 400 }
      );
    }

    console.log('🔑 [API /auth/session] Getting admin auth...');
    const adminAuth = getAdminAuth();

    console.log('🔑 [API /auth/session] Verifying ID token...');
    // Verify the ID token
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    if (!decodedToken) {
      console.log('❌ [API /auth/session] Invalid ID token');
      return NextResponse.json(
        { error: 'Invalid ID token' },
        { status: 401 }
      );
    }

    console.log('✅ [API /auth/session] Token verified for user:', decodedToken.email);

    // Set session cookie (5 days expiry)
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days in milliseconds
    console.log('🍪 [API /auth/session] Creating session cookie...');
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn,
    });

    console.log('✅ [API /auth/session] Session cookie created, setting in response');
    // Set the cookie
    const cookieStore = await cookies();
    cookieStore.set('__session', sessionCookie, {
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
    });

    console.log('✅ [API /auth/session] Session cookie set successfully');
    return NextResponse.json(
      { success: true, uid: decodedToken.uid },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ [API /auth/session] Session creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create session' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin directly in the route
function getFirebaseAdmin() {
  try {
    if (admin.apps.length === 0) {
      console.log('🔧 [API /auth/session] Initializing Firebase Admin...');
      admin.initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'vid-ad',
      });
      console.log('✅ [API /auth/session] Firebase Admin initialized');
    }
    return admin;
  } catch (error: any) {
    console.error('❌ [API /auth/session] Failed to initialize Firebase Admin:', error);
    throw error;
  }
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

    // Initialize and get admin instance
    const firebaseAdmin = getFirebaseAdmin();
    console.log('🔑 [API /auth/session] Verifying ID token...');

    // Verify the ID token
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);

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
    const sessionCookie = await firebaseAdmin.auth().createSessionCookie(idToken, {
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
    console.error('❌ [API /auth/session] Session creation error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      details: error
    });

    // Return more detailed error information for debugging
    return NextResponse.json(
      {
        error: error.message || 'Failed to create session',
        errorCode: error.code,
        errorDetails: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

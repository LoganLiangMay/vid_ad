import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK for Next.js Cloud Functions
if (!admin.apps.length) {
  console.log('🔧 [Admin] Initializing Firebase Admin SDK for Cloud Functions');

  try {
    // In Cloud Functions/Cloud Run, initialize without credentials
    // The environment will provide Application Default Credentials automatically
    admin.initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'vid-ad',
    });
    console.log('✅ [Admin] Firebase Admin initialized successfully');
  } catch (error: any) {
    console.error('❌ [Admin] Failed to initialize Firebase Admin:', error);
    // Try fallback initialization without any options
    try {
      admin.initializeApp();
      console.log('✅ [Admin] Firebase Admin initialized with fallback');
    } catch (fallbackError: any) {
      console.error('❌ [Admin] Fallback initialization also failed:', fallbackError);
      throw fallbackError;
    }
  }
} else {
  console.log('✅ [Admin] Firebase Admin already initialized');
}

// Export services
export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
export const adminStorage = admin.storage();

// Export the admin instance itself for direct access if needed
export { admin };

// Also export as functions for consistency
export function getAdminAuth() {
  return adminAuth;
}

export function getAdminDb() {
  return adminDb;
}

export function getAdminStorage() {
  return adminStorage;
}

// Deprecated: Use getter functions instead
// export const adminAuth = getAdminAuth();
// export const adminDb = getAdminDb();
// export const adminStorage = getAdminStorage();

// Helper functions for common admin operations
export async function verifyIdToken(token: string) {
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying ID token:', error);
    return null;
  }
}

export async function createCustomToken(uid: string, claims?: object) {
  try {
    const customToken = await admin.auth().createCustomToken(uid, claims);
    return customToken;
  } catch (error) {
    console.error('Error creating custom token:', error);
    return null;
  }
}

export async function getUserByEmail(email: string) {
  try {
    const user = await admin.auth().getUserByEmail(email);
    return user;
  } catch (error) {
    console.error('Error fetching user by email:', error);
    return null;
  }
}

export async function setCustomUserClaims(uid: string, claims: object) {
  try {
    await admin.auth().setCustomUserClaims(uid, claims);
    return true;
  } catch (error) {
    console.error('Error setting custom claims:', error);
    return false;
  }
}
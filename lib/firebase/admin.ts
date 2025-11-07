import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// Initialize admin app with applicationDefault() for Cloud Functions
// According to Firebase Admin SDK docs, this is the correct method for Cloud Run/Cloud Functions
if (!getApps().length) {
  console.log('🔧 [Admin] Initializing with applicationDefault() for Cloud Functions');
  try {
    initializeApp({
      credential: applicationDefault(),
    });
    console.log('✅ [Admin] Firebase Admin initialized successfully');
  } catch (error: any) {
    console.error('❌ [Admin] Failed to initialize Firebase Admin:', error.message);
    throw error;
  }
}

// Export admin services
export const adminAuth = getAuth();
export const adminDb = getFirestore();
export const adminStorage = getStorage();

// Helper functions for common admin operations
export async function verifyIdToken(token: string) {
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying ID token:', error);
    return null;
  }
}

export async function createCustomToken(uid: string, claims?: object) {
  try {
    const customToken = await adminAuth.createCustomToken(uid, claims);
    return customToken;
  } catch (error) {
    console.error('Error creating custom token:', error);
    return null;
  }
}

export async function getUserByEmail(email: string) {
  try {
    const user = await adminAuth.getUserByEmail(email);
    return user;
  } catch (error) {
    console.error('Error fetching user by email:', error);
    return null;
  }
}

export async function setCustomUserClaims(uid: string, claims: object) {
  try {
    await adminAuth.setCustomUserClaims(uid, claims);
    return true;
  } catch (error) {
    console.error('Error setting custom claims:', error);
    return false;
  }
}
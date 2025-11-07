import { initializeApp, getApps, cert, ServiceAccount, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// Initialize admin app
if (!getApps().length) {
  // In Cloud Functions/Firebase environment, use Application Default Credentials
  // In local dev with explicit service account, use cert()
  const isCloudEnvironment = process.env.FUNCTION_NAME || process.env.K_SERVICE;

  if (isCloudEnvironment) {
    console.log('🔧 [Admin] Initializing with Application Default Credentials (Cloud Functions)');
    initializeApp({
      credential: applicationDefault(),
    });
  } else if (process.env.FIREBASE_ADMIN_PROJECT_ID && process.env.FIREBASE_ADMIN_PRIVATE_KEY && process.env.FIREBASE_ADMIN_CLIENT_EMAIL) {
    console.log('🔧 [Admin] Initializing with explicit service account (local dev)');
    const serviceAccount: ServiceAccount = {
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    };
    initializeApp({
      credential: cert(serviceAccount),
      storageBucket: `${process.env.FIREBASE_ADMIN_PROJECT_ID}.appspot.com`,
    });
  } else {
    console.log('🔧 [Admin] Initializing with Application Default Credentials (fallback)');
    // Fallback to application default (works in Cloud Functions)
    initializeApp({
      credential: applicationDefault(),
    });
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
import { initializeApp, getApps, getApp, applicationDefault, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getStorage, Storage } from 'firebase-admin/storage';

// Initialize admin app with applicationDefault() for Cloud Functions
// According to Firebase Admin SDK docs, this is the correct method for Cloud Run/Cloud Functions
function initAdmin(): App {
  if (getApps().length === 0) {
    console.log('🔧 [Admin] Initializing with applicationDefault() for Cloud Functions');
    try {
      const app = initializeApp({
        credential: applicationDefault(),
      });
      console.log('✅ [Admin] Firebase Admin initialized successfully');
      return app;
    } catch (error: any) {
      console.error('❌ [Admin] Failed to initialize Firebase Admin:', error.message);
      throw error;
    }
  }
  return getApp();
}

// Lazy getters - only initialize when accessed
let _adminAuth: Auth | null = null;
let _adminDb: Firestore | null = null;
let _adminStorage: Storage | null = null;

export function getAdminAuth(): Auth {
  if (!_adminAuth) {
    const app = initAdmin();
    _adminAuth = getAuth(app);
    console.log('✅ [Admin] Auth service initialized');
  }
  return _adminAuth;
}

export function getAdminDb(): Firestore {
  if (!_adminDb) {
    const app = initAdmin();
    _adminDb = getFirestore(app);
    console.log('✅ [Admin] Firestore service initialized');
  }
  return _adminDb;
}

export function getAdminStorage(): Storage {
  if (!_adminStorage) {
    const app = initAdmin();
    _adminStorage = getStorage(app);
    console.log('✅ [Admin] Storage service initialized');
  }
  return _adminStorage;
}

// Deprecated: Use getter functions instead
// export const adminAuth = getAdminAuth();
// export const adminDb = getAdminDb();
// export const adminStorage = getAdminStorage();

// Helper functions for common admin operations
export async function verifyIdToken(token: string) {
  try {
    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying ID token:', error);
    return null;
  }
}

export async function createCustomToken(uid: string, claims?: object) {
  try {
    const auth = getAdminAuth();
    const customToken = await auth.createCustomToken(uid, claims);
    return customToken;
  } catch (error) {
    console.error('Error creating custom token:', error);
    return null;
  }
}

export async function getUserByEmail(email: string) {
  try {
    const auth = getAdminAuth();
    const user = await auth.getUserByEmail(email);
    return user;
  } catch (error) {
    console.error('Error fetching user by email:', error);
    return null;
  }
}

export async function setCustomUserClaims(uid: string, claims: object) {
  try {
    const auth = getAdminAuth();
    await auth.setCustomUserClaims(uid, claims);
    return true;
  } catch (error) {
    console.error('Error setting custom claims:', error);
    return false;
  }
}
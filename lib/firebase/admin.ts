import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getStorage, Storage } from 'firebase-admin/storage';

// Initialize admin app with applicationDefault() for Cloud Functions
// According to Firebase Admin SDK docs, this is the correct method for Cloud Run/Cloud Functions
function initAdmin() {
  if (getApps().length === 0) {
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
}

// Lazy getters - only initialize when accessed
let _adminAuth: Auth | null = null;
let _adminDb: Firestore | null = null;
let _adminStorage: Storage | null = null;

export function getAdminAuth(): Auth {
  if (!_adminAuth) {
    initAdmin();
    _adminAuth = getAuth();
  }
  return _adminAuth;
}

export function getAdminDb(): Firestore {
  if (!_adminDb) {
    initAdmin();
    _adminDb = getFirestore();
  }
  return _adminDb;
}

export function getAdminStorage(): Storage {
  if (!_adminStorage) {
    initAdmin();
    _adminStorage = getStorage();
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
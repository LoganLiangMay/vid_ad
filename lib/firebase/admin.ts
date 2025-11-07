import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// Initialize Firebase Admin SDK
// This runs once at module load time
let adminAuth: any = null;
let adminDb: any = null;
let adminStorage: any = null;

try {
  if (getApps().length === 0) {
    console.log('🔧 [Admin] Initializing Firebase Admin SDK');
    // For Cloud Functions, use empty config - it will use application default credentials
    initializeApp();
    console.log('✅ [Admin] Firebase Admin initialized successfully');
  } else {
    console.log('✅ [Admin] Firebase Admin already initialized');
  }

  // Initialize services
  adminAuth = getAuth();
  adminDb = getFirestore();
  adminStorage = getStorage();
  console.log('✅ [Admin] Services initialized successfully');
} catch (error: any) {
  console.error('❌ [Admin] Failed to initialize Firebase Admin:', {
    message: error.message,
    stack: error.stack,
    code: error.code,
    details: error
  });
  // Don't throw here, let the error be handled when services are used
}

// Export services
export { adminAuth, adminDb, adminStorage };

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
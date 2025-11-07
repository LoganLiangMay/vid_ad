import * as admin from 'firebase-admin';

// Private variable to track initialization
let initialized = false;

// Initialize Firebase Admin SDK for Next.js Cloud Functions
function initializeAdmin() {
  if (!initialized && !admin.apps.length) {
    console.log('🔧 [Admin] Initializing Firebase Admin SDK for Cloud Functions');

    try {
      // In Cloud Functions/Cloud Run, initialize without credentials
      // The environment will provide Application Default Credentials automatically
      admin.initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'vid-ad',
      });
      console.log('✅ [Admin] Firebase Admin initialized successfully');
      initialized = true;
    } catch (error: any) {
      console.error('❌ [Admin] Failed to initialize Firebase Admin:', error);
      // Try fallback initialization without any options
      try {
        admin.initializeApp();
        console.log('✅ [Admin] Firebase Admin initialized with fallback');
        initialized = true;
      } catch (fallbackError: any) {
        console.error('❌ [Admin] Fallback initialization also failed:', fallbackError);
        throw fallbackError;
      }
    }
  } else if (initialized || admin.apps.length > 0) {
    console.log('✅ [Admin] Firebase Admin already initialized');
  }
}

// Use getters for lazy initialization - services are only created when accessed
export const adminAuth = {
  verifyIdToken: async (token: string) => {
    initializeAdmin();
    return admin.auth().verifyIdToken(token);
  },
  createSessionCookie: async (idToken: string, options: admin.auth.SessionCookieOptions) => {
    initializeAdmin();
    return admin.auth().createSessionCookie(idToken, options);
  },
  verifySessionCookie: async (sessionCookie: string, checkRevoked?: boolean) => {
    initializeAdmin();
    return admin.auth().verifySessionCookie(sessionCookie, checkRevoked);
  },
  getUserByEmail: async (email: string) => {
    initializeAdmin();
    return admin.auth().getUserByEmail(email);
  },
  createCustomToken: async (uid: string, developerClaims?: object) => {
    initializeAdmin();
    return admin.auth().createCustomToken(uid, developerClaims);
  },
  setCustomUserClaims: async (uid: string, customUserClaims: object | null) => {
    initializeAdmin();
    return admin.auth().setCustomUserClaims(uid, customUserClaims);
  }
};

export const adminDb = new Proxy({} as admin.firestore.Firestore, {
  get(target, prop) {
    initializeAdmin();
    const db = admin.firestore();
    return (db as any)[prop];
  }
});

export const adminStorage = new Proxy({} as admin.storage.Storage, {
  get(target, prop) {
    initializeAdmin();
    const storage = admin.storage();
    return (storage as any)[prop];
  }
});

// Export the admin instance itself for direct access if needed
export { admin };

// Helper functions for common admin operations (these use the lazy-initialized adminAuth)
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
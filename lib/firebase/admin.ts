import * as admin from 'firebase-admin';

// Use globalThis to ensure true singleton across webpack chunks
declare global {
  var firebaseAdmin: admin.app.App | undefined;
  var firebaseAdminInitialized: boolean | undefined;
}

// Initialize Firebase Admin SDK with global singleton pattern
function initializeAdmin(): admin.app.App {
  // Check if already initialized in global scope
  if (globalThis.firebaseAdmin && globalThis.firebaseAdminInitialized) {
    console.log('✅ [Admin] Using existing global Firebase Admin instance');
    return globalThis.firebaseAdmin;
  }

  console.log('🔧 [Admin] Initializing Firebase Admin SDK (global singleton)');

  try {
    // Check if any apps exist
    if (admin.apps.length > 0) {
      console.log('✅ [Admin] Found existing Firebase Admin app, reusing it');
      globalThis.firebaseAdmin = admin.apps[0]!;
      globalThis.firebaseAdminInitialized = true;
      return globalThis.firebaseAdmin;
    }

    // In Cloud Functions/Cloud Run, initialize without credentials
    // The environment will provide Application Default Credentials automatically
    const app = admin.initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'vid-ad',
    });

    console.log('✅ [Admin] Firebase Admin initialized successfully (global singleton)');
    globalThis.firebaseAdmin = app;
    globalThis.firebaseAdminInitialized = true;
    return app;
  } catch (error: any) {
    console.error('❌ [Admin] Failed to initialize Firebase Admin:', error);
    // Try fallback initialization without any options
    try {
      const app = admin.initializeApp();
      console.log('✅ [Admin] Firebase Admin initialized with fallback (global singleton)');
      globalThis.firebaseAdmin = app;
      globalThis.firebaseAdminInitialized = true;
      return app;
    } catch (fallbackError: any) {
      console.error('❌ [Admin] Fallback initialization also failed:', fallbackError);
      throw fallbackError;
    }
  }
}

// Use getters for lazy initialization - services are only created when accessed
// IMPORTANT: Use the app instance's methods to avoid accessing different firebase-admin module instances
export const adminAuth = {
  verifyIdToken: async (token: string) => {
    const app = initializeAdmin();
    return app.auth().verifyIdToken(token);
  },
  createSessionCookie: async (idToken: string, options: admin.auth.SessionCookieOptions) => {
    const app = initializeAdmin();
    return app.auth().createSessionCookie(idToken, options);
  },
  verifySessionCookie: async (sessionCookie: string, checkRevoked?: boolean) => {
    const app = initializeAdmin();
    return app.auth().verifySessionCookie(sessionCookie, checkRevoked);
  },
  getUserByEmail: async (email: string) => {
    const app = initializeAdmin();
    return app.auth().getUserByEmail(email);
  },
  createCustomToken: async (uid: string, developerClaims?: object) => {
    const app = initializeAdmin();
    return app.auth().createCustomToken(uid, developerClaims);
  },
  setCustomUserClaims: async (uid: string, customUserClaims: object | null) => {
    const app = initializeAdmin();
    return app.auth().setCustomUserClaims(uid, customUserClaims);
  }
};

export const adminDb = new Proxy({} as admin.firestore.Firestore, {
  get(_target, prop) {
    const app = initializeAdmin();
    const db = app.firestore();
    return (db as any)[prop];
  }
});

export const adminStorage = new Proxy({} as admin.storage.Storage, {
  get(_target, prop) {
    const app = initializeAdmin();
    const storage = app.storage();
    return (storage as any)[prop];
  }
});

// Export the admin instance itself for direct access if needed
export { admin };

// Helper functions for common admin operations
// These use the app instance directly to ensure consistency
export async function verifyIdToken(token: string) {
  try {
    const app = initializeAdmin();
    const decodedToken = await app.auth().verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying ID token:', error);
    return null;
  }
}

export async function createCustomToken(uid: string, claims?: object) {
  try {
    const app = initializeAdmin();
    const customToken = await app.auth().createCustomToken(uid, claims);
    return customToken;
  } catch (error) {
    console.error('Error creating custom token:', error);
    return null;
  }
}

export async function getUserByEmail(email: string) {
  try {
    const app = initializeAdmin();
    const user = await app.auth().getUserByEmail(email);
    return user;
  } catch (error) {
    console.error('Error fetching user by email:', error);
    return null;
  }
}

export async function setCustomUserClaims(uid: string, claims: object) {
  try {
    const app = initializeAdmin();
    await app.auth().setCustomUserClaims(uid, claims);
    return true;
  } catch (error) {
    console.error('Error setting custom claims:', error);
    return false;
  }
}
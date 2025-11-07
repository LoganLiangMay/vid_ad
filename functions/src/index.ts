import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// Export function modules
export * from './auth';
export * from './video';
export * from './openai';
export * from './replicate';
export * from './replicateVoice';
export * from './campaigns';
export * from './s3Upload';
export * from './sceneGeneration';
export * from './conceptGeneration';
export * from './klingVideo';

// Health check function
export const healthCheck = functions.https.onRequest(async (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      firestore: 'connected',
      auth: 'connected',
      storage: 'connected'
    }
  });
});
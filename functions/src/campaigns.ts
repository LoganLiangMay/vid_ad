import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

const db = admin.firestore();

/**
 * Save a campaign to Firestore
 */
export const saveCampaign = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated'
    );
  }

  const {
    campaignId,
    campaignData,
  } = data;

  if (!campaignId || !campaignData) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'campaignId and campaignData are required'
    );
  }

  try {
    const userId = context.auth.uid;
    const campaignRef = db.collection('campaigns').doc(campaignId);

    const campaignDoc = {
      ...campaignData,
      userId,
      id: campaignId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'draft', // draft, generating, completed, failed
    };

    await campaignRef.set(campaignDoc, { merge: true });

    return {
      success: true,
      campaignId,
      message: 'Campaign saved successfully',
    };
  } catch (error: any) {
    console.error('Error saving campaign:', error);
    throw new functions.https.HttpsError(
      'internal',
      `Failed to save campaign: ${error.message}`
    );
  }
});

/**
 * Update campaign status and data
 */
export const updateCampaign = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated'
    );
  }

  const {
    campaignId,
    updates,
  } = data;

  if (!campaignId || !updates) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'campaignId and updates are required'
    );
  }

  try {
    const userId = context.auth.uid;
    const campaignRef = db.collection('campaigns').doc(campaignId);

    // Verify ownership
    const campaignDoc = await campaignRef.get();
    if (!campaignDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Campaign not found'
      );
    }

    if (campaignDoc.data()?.userId !== userId) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'You do not have permission to update this campaign'
      );
    }

    await campaignRef.update({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      message: 'Campaign updated successfully',
    };
  } catch (error: any) {
    console.error('Error updating campaign:', error);
    throw new functions.https.HttpsError(
      'internal',
      `Failed to update campaign: ${error.message}`
    );
  }
});

/**
 * Get a specific campaign
 */
export const getCampaign = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated'
    );
  }

  const { campaignId } = data;

  if (!campaignId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'campaignId is required'
    );
  }

  try {
    const userId = context.auth.uid;
    const campaignRef = db.collection('campaigns').doc(campaignId);
    const campaignDoc = await campaignRef.get();

    if (!campaignDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Campaign not found'
      );
    }

    const campaignData = campaignDoc.data();

    // Verify ownership
    if (campaignData?.userId !== userId) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'You do not have permission to view this campaign'
      );
    }

    return {
      success: true,
      campaign: {
        id: campaignDoc.id,
        ...campaignData,
      },
    };
  } catch (error: any) {
    console.error('Error getting campaign:', error);
    throw new functions.https.HttpsError(
      'internal',
      `Failed to get campaign: ${error.message}`
    );
  }
});

/**
 * Get all campaigns for the current user
 */
export const getUserCampaigns = functions.https.onCall(async (_data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated'
    );
  }

  try {
    const userId = context.auth.uid;
    const campaignsRef = db.collection('campaigns')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(50);

    const snapshot = await campaignsRef.get();
    const campaigns = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {
      success: true,
      campaigns,
    };
  } catch (error: any) {
    console.error('Error getting user campaigns:', error);
    throw new functions.https.HttpsError(
      'internal',
      `Failed to get campaigns: ${error.message}`
    );
  }
});

/**
 * Delete a campaign
 */
export const deleteCampaign = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated'
    );
  }

  const { campaignId } = data;

  if (!campaignId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'campaignId is required'
    );
  }

  try {
    const userId = context.auth.uid;
    const campaignRef = db.collection('campaigns').doc(campaignId);

    // Verify ownership
    const campaignDoc = await campaignRef.get();
    if (!campaignDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Campaign not found'
      );
    }

    if (campaignDoc.data()?.userId !== userId) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'You do not have permission to delete this campaign'
      );
    }

    await campaignRef.delete();

    return {
      success: true,
      message: 'Campaign deleted successfully',
    };
  } catch (error: any) {
    console.error('Error deleting campaign:', error);
    throw new functions.https.HttpsError(
      'internal',
      `Failed to delete campaign: ${error.message}`
    );
  }
});


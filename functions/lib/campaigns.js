"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCampaign = exports.getUserCampaigns = exports.getCampaign = exports.updateCampaign = exports.saveCampaign = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
/**
 * Save a campaign to Firestore
 */
exports.saveCampaign = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { campaignId, campaignData, } = data;
    if (!campaignId || !campaignData) {
        throw new functions.https.HttpsError('invalid-argument', 'campaignId and campaignData are required');
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
    }
    catch (error) {
        console.error('Error saving campaign:', error);
        throw new functions.https.HttpsError('internal', `Failed to save campaign: ${error.message}`);
    }
});
/**
 * Update campaign status and data
 */
exports.updateCampaign = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { campaignId, updates, } = data;
    if (!campaignId || !updates) {
        throw new functions.https.HttpsError('invalid-argument', 'campaignId and updates are required');
    }
    try {
        const userId = context.auth.uid;
        const campaignRef = db.collection('campaigns').doc(campaignId);
        // Verify ownership
        const campaignDoc = await campaignRef.get();
        if (!campaignDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Campaign not found');
        }
        if (campaignDoc.data()?.userId !== userId) {
            throw new functions.https.HttpsError('permission-denied', 'You do not have permission to update this campaign');
        }
        await campaignRef.update({
            ...updates,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return {
            success: true,
            message: 'Campaign updated successfully',
        };
    }
    catch (error) {
        console.error('Error updating campaign:', error);
        throw new functions.https.HttpsError('internal', `Failed to update campaign: ${error.message}`);
    }
});
/**
 * Get a specific campaign
 */
exports.getCampaign = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { campaignId } = data;
    if (!campaignId) {
        throw new functions.https.HttpsError('invalid-argument', 'campaignId is required');
    }
    try {
        const userId = context.auth.uid;
        const campaignRef = db.collection('campaigns').doc(campaignId);
        const campaignDoc = await campaignRef.get();
        if (!campaignDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Campaign not found');
        }
        const campaignData = campaignDoc.data();
        // Verify ownership
        if (campaignData?.userId !== userId) {
            throw new functions.https.HttpsError('permission-denied', 'You do not have permission to view this campaign');
        }
        return {
            success: true,
            campaign: {
                id: campaignDoc.id,
                ...campaignData,
            },
        };
    }
    catch (error) {
        console.error('Error getting campaign:', error);
        throw new functions.https.HttpsError('internal', `Failed to get campaign: ${error.message}`);
    }
});
/**
 * Get all campaigns for the current user
 */
exports.getUserCampaigns = functions.https.onCall(async (_data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
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
    }
    catch (error) {
        console.error('Error getting user campaigns:', error);
        throw new functions.https.HttpsError('internal', `Failed to get campaigns: ${error.message}`);
    }
});
/**
 * Delete a campaign
 */
exports.deleteCampaign = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { campaignId } = data;
    if (!campaignId) {
        throw new functions.https.HttpsError('invalid-argument', 'campaignId is required');
    }
    try {
        const userId = context.auth.uid;
        const campaignRef = db.collection('campaigns').doc(campaignId);
        // Verify ownership
        const campaignDoc = await campaignRef.get();
        if (!campaignDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Campaign not found');
        }
        if (campaignDoc.data()?.userId !== userId) {
            throw new functions.https.HttpsError('permission-denied', 'You do not have permission to delete this campaign');
        }
        await campaignRef.delete();
        return {
            success: true,
            message: 'Campaign deleted successfully',
        };
    }
    catch (error) {
        console.error('Error deleting campaign:', error);
        throw new functions.https.HttpsError('internal', `Failed to delete campaign: ${error.message}`);
    }
});
//# sourceMappingURL=campaigns.js.map
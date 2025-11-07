import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { firestore } from './config';
import type { Campaign, CampaignInput } from '../types/campaign';

const CAMPAIGNS_COLLECTION = 'campaigns';

/**
 * Convert Firestore Timestamp to Date
 */
function convertTimestamps(data: any): any {
  if (data.createdAt instanceof Timestamp) {
    data.createdAt = data.createdAt.toDate();
  }
  if (data.updatedAt instanceof Timestamp) {
    data.updatedAt = data.updatedAt.toDate();
  }
  return data;
}

/**
 * Create a new campaign in Firestore
 */
export async function createCampaign(
  campaignData: CampaignInput
): Promise<Campaign> {
  const campaignsRef = collection(firestore, CAMPAIGNS_COLLECTION);
  const newCampaignRef = doc(campaignsRef);

  const campaign: Omit<Campaign, 'createdAt' | 'updatedAt'> & {
    createdAt: any;
    updatedAt: any;
  } = {
    ...campaignData,
    id: newCampaignRef.id,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(newCampaignRef, campaign);

  return {
    ...campaign,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Get a campaign by ID
 */
export async function getCampaign(campaignId: string): Promise<Campaign | null> {
  const campaignRef = doc(firestore, CAMPAIGNS_COLLECTION, campaignId);
  const campaignSnap = await getDoc(campaignRef);

  if (!campaignSnap.exists()) {
    return null;
  }

  const data = campaignSnap.data();
  return convertTimestamps({ id: campaignSnap.id, ...data }) as Campaign;
}

/**
 * Get all campaigns for a user
 */
export async function getUserCampaigns(
  userId: string,
  limitCount: number = 50
): Promise<Campaign[]> {
  const campaignsRef = collection(firestore, CAMPAIGNS_COLLECTION);
  const q = query(
    campaignsRef,
    where('userId', '==', userId),
    orderBy('updatedAt', 'desc'),
    limit(limitCount)
  );

  const querySnapshot = await getDocs(q);
  const campaigns: Campaign[] = [];

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    campaigns.push(convertTimestamps({ id: doc.id, ...data }) as Campaign);
  });

  return campaigns;
}

/**
 * Update a campaign
 */
export async function updateCampaign(
  campaignId: string,
  updates: Partial<CampaignInput>
): Promise<void> {
  const campaignRef = doc(firestore, CAMPAIGNS_COLLECTION, campaignId);

  await updateDoc(campaignRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Update campaign status
 */
export async function updateCampaignStatus(
  campaignId: string,
  status: Campaign['status']
): Promise<void> {
  await updateCampaign(campaignId, { status });
}

/**
 * Add video URL to campaign
 */
export async function addVideoToCampaign(
  campaignId: string,
  videoUrl: string,
  videoKey: string,
  videoDuration?: number
): Promise<void> {
  await updateCampaign(campaignId, {
    videoUrl,
    videoKey,
    videoDuration,
    status: 'completed',
  });
}

/**
 * Add image URLs to campaign scenes
 */
export async function addSceneImages(
  campaignId: string,
  sceneUpdates: Array<{ sceneNumber: number; imageUrl: string; imageKey: string }>
): Promise<void> {
  const campaign = await getCampaign(campaignId);
  if (!campaign) {
    throw new Error('Campaign not found');
  }

  const updatedScenes = campaign.scenes.map((scene) => {
    const update = sceneUpdates.find((u) => u.sceneNumber === scene.sceneNumber);
    if (update) {
      return {
        ...scene,
        imageUrl: update.imageUrl,
        imageKey: update.imageKey,
      };
    }
    return scene;
  });

  await updateCampaign(campaignId, { scenes: updatedScenes });
}

/**
 * Delete a campaign
 */
export async function deleteCampaign(campaignId: string): Promise<void> {
  const campaignRef = doc(firestore, CAMPAIGNS_COLLECTION, campaignId);
  await deleteDoc(campaignRef);
}

/**
 * Get campaigns by status
 */
export async function getCampaignsByStatus(
  userId: string,
  status: Campaign['status'],
  limitCount: number = 20
): Promise<Campaign[]> {
  const campaignsRef = collection(firestore, CAMPAIGNS_COLLECTION);
  const q = query(
    campaignsRef,
    where('userId', '==', userId),
    where('status', '==', status),
    orderBy('updatedAt', 'desc'),
    limit(limitCount)
  );

  const querySnapshot = await getDocs(q);
  const campaigns: Campaign[] = [];

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    campaigns.push(convertTimestamps({ id: doc.id, ...data }) as Campaign);
  });

  return campaigns;
}

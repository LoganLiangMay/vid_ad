export interface Scene {
  sceneNumber: number;
  prompt: string;
  duration: number;
  visualDescription: string;
  voiceoverText: string;
  imageUrl?: string; // S3 URL
  imageKey?: string; // S3 key
}

export interface Campaign {
  id: string;
  userId: string;
  name: string;
  description?: string;

  // Video details
  videoUrl?: string; // S3 URL
  videoKey?: string; // S3 key
  videoDuration?: number;

  // Scenes
  scenes: Scene[];
  totalScenes: number;

  // Voice settings
  voiceId?: string;
  voiceName?: string;

  // Metadata
  status: 'draft' | 'generating' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;

  // Storage info
  s3Bucket?: string;
  totalSize?: number; // in bytes

  // Tags and categories
  tags?: string[];
  category?: string;
}

export type CampaignInput = Omit<Campaign, 'id' | 'createdAt' | 'updatedAt'>;

export interface CampaignWithMedia extends Campaign {
  scenesWithImages: (Scene & { imageFile?: File })[];
  videoFile?: File;
}

import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase/config';

export interface Voice {
  id: string;
  name: string;
  description?: string;
  gender?: 'male' | 'female' | 'neutral';
  accent?: string;
  model: string;
}

export interface ClonedVoice {
  id: string;
  voiceName: string;
  replicateVoiceId: string;
  replicateModel: string;
  audioUrl: string;
  createdAt: any;
  usageCount: number;
  lastUsed?: any;
}

export interface VoiceoverResult {
  success: boolean;
  voiceoverId?: string;
  audioUrl?: string;
  generationTime?: number;
  voiceType?: string;
  voiceId?: string;
}

export class VoiceoverService {
  private static instance: VoiceoverService;

  private constructor() {}

  static getInstance(): VoiceoverService {
    if (!VoiceoverService.instance) {
      VoiceoverService.instance = new VoiceoverService();
    }
    return VoiceoverService.instance;
  }

  /**
   * Discover available voice models on Replicate
   */
  async discoverVoiceModels(): Promise<any[]> {
    try {
      const discoverModels = httpsCallable(functions, 'discoverReplicateVoiceModels');
      const result = await discoverModels();
      const data = result.data as any;
      return data.success ? data.models : [];
    } catch (error) {
      console.error('Error discovering voice models:', error);
      return [];
    }
  }

  /**
   * Get available default voices
   */
  async getDefaultVoices(): Promise<Voice[]> {
    try {
      const getVoices = httpsCallable(functions, 'getReplicateDefaultVoices');
      const result = await getVoices();
      const data = result.data as any;
      return data.success ? data.voices : [];
    } catch (error) {
      console.error('Error getting default voices:', error);
      return [];
    }
  }

  /**
   * Get user's cloned voices
   */
  async getClonedVoices(): Promise<ClonedVoice[]> {
    try {
      const getVoices = httpsCallable(functions, 'getUserClonedVoices');
      const result = await getVoices();
      const data = result.data as any;
      return data.success ? data.voices : [];
    } catch (error) {
      console.error('Error getting cloned voices:', error);
      return [];
    }
  }

  /**
   * Generate voiceover
   */
  async generateVoiceover(
    text: string,
    voiceType: 'default' | 'cloned',
    voiceId: string,
    speed: number = 1.0
  ): Promise<VoiceoverResult> {
    try {
      const generate = httpsCallable(functions, 'generateReplicateVoiceover');
      const result = await generate({
        text,
        voiceType,
        voiceId,
        speed,
      });
      return result.data as VoiceoverResult;
    } catch (error: any) {
      console.error('Error generating voiceover:', error);
      throw error;
    }
  }

  /**
   * Clone voice from audio URL
   */
  async cloneVoice(audioUrl: string, voiceName: string): Promise<{ success: boolean; voiceId?: string; voiceName?: string }> {
    try {
      const clone = httpsCallable(functions, 'cloneVoice');
      const result = await clone({
        audioUrl,
        voiceName,
      });
      return result.data as any;
    } catch (error: any) {
      console.error('Error cloning voice:', error);
      throw error;
    }
  }

  /**
   * Delete cloned voice
   */
  async deleteClonedVoice(voiceName: string): Promise<void> {
    try {
      const deleteVoice = httpsCallable(functions, 'deleteClonedVoice');
      await deleteVoice({ voiceName });
    } catch (error: any) {
      console.error('Error deleting cloned voice:', error);
      throw error;
    }
  }

  /**
   * Rename cloned voice
   */
  async renameClonedVoice(oldName: string, newName: string): Promise<void> {
    try {
      const rename = httpsCallable(functions, 'renameClonedVoice');
      await rename({ oldName, newName });
    } catch (error: any) {
      console.error('Error renaming cloned voice:', error);
      throw error;
    }
  }

  /**
   * Compose video with voiceover
   */
  async composeVideo(
    videoUrl: string,
    voiceoverUrl: string | null,
    videoVolume: number = 1.0,
    voiceoverVolume: number = 1.0
  ): Promise<{ success: boolean; composedVideoUrl?: string }> {
    try {
      const compose = httpsCallable(functions, 'composeVideoWithVoiceover');
      const result = await compose({
        videoUrl,
        voiceoverUrl,
        videoVolume,
        voiceoverVolume,
      });
      return result.data as any;
    } catch (error: any) {
      console.error('Error composing video:', error);
      throw error;
    }
  }
}


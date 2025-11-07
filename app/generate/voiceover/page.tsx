'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import VoiceoverWorkflow from '@/components/voiceover/VoiceoverWorkflow';

interface VideoData {
  id: string;
  url: string;
  productName?: string;
  brandTone?: string;
  duration?: number;
  metadata?: any;
}

export default function VoiceoverPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const videoId = searchParams.get('videoId');
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!videoId) {
      setError('Video ID is required');
      setLoading(false);
      return;
    }

    // Load video data from localStorage or Firestore
    // For now, try to get from localStorage (campaign data)
    const loadVideoData = async () => {
      try {
        // Try to get from localStorage first (from results page)
        const campaignId = searchParams.get('campaignId');
        if (campaignId) {
          const campaignKey = `campaign_${campaignId}`;
          const campaignDataStr = localStorage.getItem(campaignKey);
          if (campaignDataStr) {
            const campaignData = JSON.parse(campaignDataStr);
            // Find video in campaign data
            // For now, assume videoId matches the prediction ID
            setVideoData({
              id: videoId,
              url: '', // Will be loaded from Replicate status
              productName: campaignData.productName,
              brandTone: campaignData.brandTone,
              duration: campaignData.duration,
              metadata: campaignData,
            });
            setLoading(false);
            return;
          }
        }

        // TODO: Load from Firestore if not in localStorage
        // For now, set basic data
        setVideoData({
          id: videoId,
          url: '',
          metadata: {},
        });
        setLoading(false);
      } catch (err: any) {
        console.error('Error loading video data:', err);
        setError(err.message || 'Failed to load video data');
        setLoading(false);
      }
    };

    loadVideoData();
  }, [videoId, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !videoData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
          <p className="text-gray-600 mb-4">{error || 'Video not found'}</p>
          <button
            onClick={() => router.push('/generate/results')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Results
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <button
              onClick={() => router.back()}
              className="text-blue-600 hover:text-blue-700 mb-4"
            >
              ← Back
            </button>
            <h1 className="text-3xl font-bold text-gray-900">
              Add Voiceover to Video
            </h1>
            <p className="text-gray-600 mt-2">
              Enhance your video with professional narration
            </p>
          </div>

          {videoId && <VoiceoverWorkflow videoId={videoId} videoData={videoData} />}
        </div>
      </div>
    </div>
  );
}


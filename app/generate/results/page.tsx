'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface TransitionVideo {
  videoId: string;
  predictionId: string;
  transitionIndex: number;
  fromSceneNumber: number;
  toSceneNumber: number;
  status: 'starting' | 'processing' | 'succeeded' | 'failed';
  output?: string;
  error?: string;
  thumbnail?: string;
  progress: number;
}

export default function GenerateResultsPage() {
  const router = useRouter();
  const [campaignId, setCampaignId] = useState<string>('');
  const [campaignData, setCampaignData] = useState<any>(null);
  const [transitionVideos, setTransitionVideos] = useState<TransitionVideo[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentPhase, setCurrentPhase] = useState('Loading campaign...');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCampaign();
  }, []);

  const loadCampaign = async () => {
    try {
      // Get campaign ID from URL
      const searchParams = new URLSearchParams(window.location.search);
      const id = searchParams.get('campaignId');

      if (!id) {
        throw new Error('No campaign ID provided');
      }

      setCampaignId(id);
      console.log('📋 Loading campaign:', id);

      // Try localStorage first
      const campaignKey = `campaign_${id}`;
      const localData = localStorage.getItem(campaignKey);

      if (localData) {
        const parsed = JSON.parse(localData);
        setCampaignData(parsed);
        console.log('✅ Campaign loaded from localStorage');
        console.log('🖼️ Storyboard images:', parsed.storyboardImages?.length || 0);

        // Check if videos already exist
        if (parsed.videos && parsed.videos.length > 0) {
          console.log('📹 Found existing videos:', parsed.videos.length);
          loadExistingVideos(parsed.videos);
        }

        return;
      }

      // Fallback to Firestore
      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('@/lib/firebase/config');
      const getCampaignFn = httpsCallable(functions, 'getCampaign');
      const result = await getCampaignFn({ campaignId: id });
      const data = result.data as any;

      if (data.success && data.campaign) {
        setCampaignData(data.campaign);
        console.log('✅ Campaign loaded from Firestore');

        // Check if videos already exist
        if (data.campaign.videos && data.campaign.videos.length > 0) {
          loadExistingVideos(data.campaign.videos);
        }
      } else {
        throw new Error('Campaign not found');
      }
    } catch (err) {
      console.error('❌ Error loading campaign:', err);
      setError(err instanceof Error ? err.message : 'Failed to load campaign');
      alert('Campaign not found. Redirecting to generate page...');
      router.push('/generate');
    }
  };

  const loadExistingVideos = (videos: any[]) => {
    const mapped = videos.map((v: any) => ({
      videoId: v.videoId,
      predictionId: v.predictionId,
      transitionIndex: v.transitionIndex,
      fromSceneNumber: v.fromSceneNumber,
      toSceneNumber: v.toSceneNumber,
      status: v.status || 'processing',
      output: v.output,
      error: v.error,
      progress: v.status === 'succeeded' ? 100 : 0,
    }));

    setTransitionVideos(mapped);

    // Check if any are still processing
    const hasProcessing = mapped.some((v: any) =>
      v.status === 'starting' || v.status === 'processing'
    );

    if (hasProcessing) {
      setIsGenerating(true);
      setCurrentPhase('Resuming video generation...');
      startPolling(mapped.map((v: any) => v.videoId));
    } else {
      const allSucceeded = mapped.every((v: any) => v.status === 'succeeded');
      if (allSucceeded) {
        setCurrentPhase('All videos completed!');
        setProgress(100);
      }
    }
  };

  const startGeneration = async () => {
    if (!campaignData || !campaignData.storyboardImages) {
      alert('No storyboard images found. Please complete the storyboard first.');
      return;
    }

    const scenes = campaignData.storyboardImages;

    if (scenes.length < 2) {
      alert('Need at least 2 scenes to create transitions');
      return;
    }

    setIsGenerating(true);
    setCurrentPhase('Starting Veo 3.1 video generation...');
    setProgress(10);

    try {
      console.log('🎬 Starting Veo 3.1 transitions for', scenes.length, 'scenes');

      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('@/lib/firebase/config');
      const generateTransitions = httpsCallable(functions, 'generateVeoTransitions');

      // Map storyboard images to scene format
      const sceneData = scenes.map((img: any) => ({
        id: img.id,
        url: img.url,
        prompt: img.prompt || '',
        sceneNumber: img.sceneNumber,
        description: img.description || '',
        mood: img.mood || '',
      }));

      // Get duration and aspect ratio from campaign data
      const duration = Math.min(8, Math.max(4, campaignData.duration || 8)); // Veo: 4-8 seconds
      const orientation = campaignData.orientation || 'portrait';
      const aspectRatio = orientation === 'landscape' ? '16:9' : '9:16'; // Veo only supports 16:9 or 9:16
      const resolution = campaignData.resolution === '1080p' ? '1080p' : '720p';
      const generateAudio = campaignData.includeBackgroundMusic || false;

      const result = await generateTransitions({
        campaignId,
        scenes: sceneData,
        duration,
        aspectRatio,
        resolution,
        generateAudio,
      });

      const data = result.data as any;

      if (!data.success) {
        throw new Error(data.message || 'Failed to start video generation');
      }

      console.log('✅ Started generation of', data.totalVideos, 'transition videos');

      // Initialize videos in state
      const initialVideos = data.videos.map((v: any) => ({
        videoId: v.videoId,
        predictionId: v.predictionId,
        transitionIndex: v.transitionIndex,
        fromSceneNumber: v.fromSceneNumber,
        toSceneNumber: v.toSceneNumber,
        status: v.status,
        progress: 0,
      }));

      setTransitionVideos(initialVideos);
      setCurrentPhase(`Generating ${data.totalVideos} transition videos...`);
      setProgress(20);

      // Start polling
      startPolling(data.videos.map((v: any) => v.videoId));

    } catch (err) {
      console.error('❌ Error starting generation:', err);
      setError(err instanceof Error ? err.message : 'Failed to start generation');
      setIsGenerating(false);
      alert('Failed to start video generation. Please try again.');
    }
  };

  const startPolling = (videoIds: string[]) => {
    let pollCount = 0;
    const maxPolls = 240; // 20 minutes at 5 second intervals

    const pollInterval = setInterval(async () => {
      pollCount++;

      try {
        const { httpsCallable } = await import('firebase/functions');
        const { functions } = await import('@/lib/firebase/config');
        const checkStatus = httpsCallable(functions, 'checkVeoTransitionsStatus');

        const result = await checkStatus({
          campaignId,
          videoIds,
        });

        const data = result.data as any;

        if (!data.success) {
          throw new Error('Failed to check status');
        }

        console.log(`📊 Poll ${pollCount}: ${data.completedCount}/${data.totalCount} complete`);

        // Update videos with latest status
        setTransitionVideos(prevVideos => {
          return data.videos.map((v: any) => {
            const prev = prevVideos.find((pv: any) => pv.videoId === v.videoId);
            return {
              videoId: v.videoId,
              transitionIndex: v.transitionIndex,
              fromSceneNumber: v.fromSceneNumber,
              toSceneNumber: v.toSceneNumber,
              status: v.status,
              output: v.output,
              error: v.error,
              progress: v.status === 'succeeded' ? 100 :
                       v.status === 'failed' ? 0 :
                       Math.min(95, 20 + (pollCount * 2)),
              thumbnail: prev?.thumbnail,
            };
          });
        });

        // Update overall progress
        const overallProgress = 20 + ((data.completedCount / data.totalCount) * 75);
        setProgress(Math.min(95, overallProgress));

        // Check if all complete
        if (data.allComplete) {
          console.log('✅ All videos completed!');
          clearInterval(pollInterval);
          setIsGenerating(false);
          setCurrentPhase('All videos completed!');
          setProgress(100);

          // Upload videos to S3
          uploadVideosToS3(data.videos.filter((v: any) => v.status === 'succeeded'));
        }

        // Check if any failed
        if (data.anyFailed) {
          const failedVideos = data.videos.filter((v: any) => v.status === 'failed');
          console.error('❌ Some videos failed:', failedVideos);
          setCurrentPhase(`${data.completedCount}/${data.totalCount} completed (${failedVideos.length} failed)`);
        }

      } catch (err) {
        console.error('❌ Error polling status:', err);
      }

      // Timeout after max polls
      if (pollCount >= maxPolls) {
        console.warn('⚠️ Polling timeout reached');
        clearInterval(pollInterval);
        setIsGenerating(false);
        setCurrentPhase('Generation timed out. Please refresh to check status.');
      }
    }, 5000); // Poll every 5 seconds
  };

  const uploadVideosToS3 = async (videos: any[]) => {
    try {
      console.log('📤 Uploading', videos.length, 'videos to S3...');
      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('@/lib/firebase/config');
      const uploadVideoFn = httpsCallable(functions, 'uploadVideoToS3');

      for (const video of videos) {
        if (!video.output) continue;

        try {
          const result = await uploadVideoFn({
            videoUrl: video.output,
            campaignId,
            videoId: video.videoId,
            thumbnailUrl: video.output, // Use video URL as thumbnail for now
          });

          const data = result.data as any;
          if (data.success) {
            console.log(`✅ Uploaded video ${video.transitionIndex + 1} to S3`);

            // Update video with S3 URL
            setTransitionVideos(prev =>
              prev.map(v =>
                v.videoId === video.videoId
                  ? { ...v, output: data.videoUrl, thumbnail: data.thumbnailUrl }
                  : v
              )
            );
          }
        } catch (uploadError) {
          console.warn(`⚠️ Failed to upload video ${video.videoId} to S3:`, uploadError);
          // Continue with Replicate URL
        }
      }

      console.log('✅ S3 upload complete');
    } catch (err) {
      console.error('❌ Error uploading to S3:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded':
        return 'bg-green-100 text-green-800';
      case 'processing':
      case 'starting':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'succeeded':
        return 'Complete';
      case 'processing':
        return 'Generating';
      case 'starting':
        return 'Starting';
      case 'failed':
        return 'Failed';
      default:
        return status;
    }
  };

  // Sort videos by transition index for display
  const sortedVideos = [...transitionVideos].sort((a, b) => a.transitionIndex - b.transitionIndex);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Video Generation</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard/campaigns"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4">
          {/* Campaign Info */}
          {campaignData && (
            <div className="mb-6 bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {campaignData.productName || 'Campaign'}
              </h2>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>🎬 {campaignData.storyboardImages?.length || 0} scenes</span>
                <span>→</span>
                <span>🎥 {(campaignData.storyboardImages?.length || 1) - 1} transitions</span>
                <span>→</span>
                <span>⏱️ {(campaignData.duration || 5) * ((campaignData.storyboardImages?.length || 1) - 1)}s total</span>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Generate Button */}
          {campaignData && transitionVideos.length === 0 && !isGenerating && (
            <div className="mb-6 bg-white rounded-lg shadow-md p-8 text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Ready to Generate Videos
              </h3>
              <p className="text-gray-600 mb-6">
                Create {(campaignData.storyboardImages?.length || 1) - 1} smooth transitions between your {campaignData.storyboardImages?.length} scenes
              </p>
              <button
                onClick={startGeneration}
                className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold"
              >
                Generate Transition Videos
              </button>
              <p className="text-sm text-gray-500 mt-4">
                Estimated time: {Math.ceil(((campaignData.storyboardImages?.length || 1) - 1) * 1.5)} - {Math.ceil(((campaignData.storyboardImages?.length || 1) - 1) * 3)} minutes
              </p>
            </div>
          )}

          {/* Progress Bar */}
          {isGenerating && (
            <div className="mb-6 bg-white rounded-lg shadow-md p-6">
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">{currentPhase}</span>
                  <span className="text-sm font-medium text-gray-700">{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className="bg-purple-600 h-4 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              <p className="text-sm text-gray-600">
                This may take several minutes. You can close this page and return later - your progress is saved.
              </p>
            </div>
          )}

          {/* Videos Grid */}
          {sortedVideos.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900">Transition Videos</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedVideos.map((video) => (
                  <div
                    key={video.videoId}
                    className="bg-white rounded-lg shadow-md overflow-hidden"
                  >
                    {/* Video Preview */}
                    <div className="aspect-[9/16] bg-gray-100 relative">
                      {video.output && video.status === 'succeeded' ? (
                        <video
                          src={video.output}
                          controls
                          className="w-full h-full object-cover"
                          poster={video.thumbnail}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {video.status === 'failed' ? (
                            <div className="text-red-500 text-center p-4">
                              <div className="text-4xl mb-2">⚠️</div>
                              <p className="text-sm">Generation Failed</p>
                            </div>
                          ) : (
                            <div className="text-center">
                              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                              <p className="text-sm text-gray-600">Generating...</p>
                              <p className="text-xs text-gray-500 mt-1">{video.progress}%</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Video Info */}
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">
                          Scene {video.fromSceneNumber} → {video.toSceneNumber}
                        </h4>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(video.status)}`}>
                          {getStatusLabel(video.status)}
                        </span>
                      </div>

                      <p className="text-sm text-gray-600 mb-3">
                        Transition {video.transitionIndex + 1}
                      </p>

                      {/* Actions */}
                      {video.status === 'succeeded' && video.output && (
                        <div className="flex space-x-2">
                          <a
                            href={video.output}
                            download
                            className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm text-center"
                          >
                            Download
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!campaignData && !error && (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading campaign...</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

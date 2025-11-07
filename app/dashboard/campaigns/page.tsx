'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase/config';
import Link from 'next/link';

interface Campaign {
  id: string;
  productName?: string;
  brandTone?: string;
  status?: 'draft' | 'generating' | 'completed' | 'failed';
  createdAt?: any;
  updatedAt?: any;
  videos?: any[];
}

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      
      // Try to load from Firestore first
      try {
        const getUserCampaignsFn = httpsCallable(functions, 'getUserCampaigns');
        const result = await getUserCampaignsFn();
        const data = result.data as any;
        if (data.success) {
          setCampaigns(data.campaigns || []);
          return;
        }
      } catch (firestoreError: any) {
        console.warn('Firestore not available, falling back to localStorage:', firestoreError);
      }

      // Fallback to localStorage
      const campaigns: Campaign[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('campaign_')) {
          try {
            const campaignData = JSON.parse(localStorage.getItem(key) || '{}');
            if (campaignData.id) {
              campaigns.push({
                id: campaignData.id,
                productName: campaignData.productName,
                brandTone: campaignData.brandTone,
                status: campaignData.status || 'draft',
                createdAt: { toMillis: () => campaignData.createdAt || Date.now() },
                videos: campaignData.videos || [],
              });
            }
          } catch (e) {
            console.warn('Error parsing campaign from localStorage:', key, e);
          }
        }
      }
      
      // Sort by creation date (newest first)
      campaigns.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });
      
      setCampaigns(campaigns);
    } catch (error: any) {
      console.error('Error loading campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(campaignId);
      
      // Try Firestore first
      try {
        const deleteCampaignFn = httpsCallable(functions, 'deleteCampaign');
        await deleteCampaignFn({ campaignId });
      } catch (firestoreError) {
        console.warn('Firestore delete failed, using localStorage:', firestoreError);
      }
      
      // Always delete from localStorage
      const campaignKey = `campaign_${campaignId}`;
      localStorage.removeItem(campaignKey);
      
      await loadCampaigns();
    } catch (error: any) {
      console.error('Error deleting campaign:', error);
      alert(error.message || 'Failed to delete campaign');
    } finally {
      setDeleting(null);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'generating':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'generating':
        return 'Generating';
      case 'failed':
        return 'Failed';
      case 'draft':
        return 'Draft';
      default:
        return 'Unknown';
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    try {
      const date = timestamp.toMillis ? new Date(timestamp.toMillis()) : new Date(timestamp);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch {
      return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">My Campaigns</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/generate"
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Create New Campaign
              </Link>
              <Link
                href="/dashboard"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4">
          {campaigns.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">No campaigns yet</h3>
              <p className="mt-2 text-sm text-gray-500">
                Get started by creating your first video ad campaign.
              </p>
              <div className="mt-6">
                <Link
                  href="/generate"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Create Campaign
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {campaign.productName || 'Untitled Campaign'}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {campaign.brandTone || 'No tone specified'}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                          campaign.status
                        )}`}
                      >
                        {getStatusLabel(campaign.status)}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Created:</span>
                        <span className="text-gray-900">{formatDate(campaign.createdAt)}</span>
                      </div>
                      {campaign.updatedAt && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Updated:</span>
                          <span className="text-gray-900">{formatDate(campaign.updatedAt)}</span>
                        </div>
                      )}
                      {campaign.videos && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Videos:</span>
                          <span className="text-gray-900">
                            {campaign.videos.filter((v: any) => v.status === 'completed').length} / {campaign.videos.length}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Video Preview */}
                    {campaign.videos && campaign.videos.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs text-gray-500 mb-2">
                          {campaign.videos.filter((v: any) => v.status === 'completed').length} / {campaign.videos.length} videos
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          {campaign.videos.slice(0, 3).map((video: any) => (
                            <div key={video.id} className="aspect-[9/16] bg-gray-100 rounded overflow-hidden">
                              {video.thumbnail ? (
                                <img src={video.thumbnail} alt="Video thumbnail" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                  {video.status === 'completed' ? '✓' : '...'}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex space-x-2">
                      <button
                        onClick={() => router.push(`/generate/results?campaignId=${campaign.id}`)}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                      >
                        {campaign.status === 'generating' ? 'View Progress' : 'View Campaign'}
                      </button>
                      <button
                        onClick={() => handleDelete(campaign.id)}
                        disabled={deleting === campaign.id}
                        className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm"
                      >
                        {deleting === campaign.id ? '...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}


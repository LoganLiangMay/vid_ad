'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useState, useEffect } from 'react';
import Header from '@/components/Header';

interface Campaign {
  id: string;
  productName: string;
  status: string;
  createdAt: number;
  updatedAt?: number;
  currentStep?: number;
  userId?: string;
  userEmail?: string;
  isTemplate?: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const { currentUser, logout, loading } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [templateCampaigns, setTemplateCampaigns] = useState<Campaign[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Fetch campaigns
  useEffect(() => {
    const fetchCampaigns = async () => {
      if (!currentUser) return;

      try {
        setLoadingCampaigns(true);

        // Use Firebase Cloud Function directly (same as campaigns page)
        const { httpsCallable } = await import('firebase/functions');
        const { functions } = await import('@/lib/firebase/config');

        const getUserCampaignsFn = httpsCallable(functions, 'getUserCampaigns');
        const result = await getUserCampaignsFn() as any;

        if (result.data.success && result.data.campaigns) {
          // Sort by most recent first
          const sortedCampaigns = result.data.campaigns.sort((a: Campaign, b: Campaign) =>
            (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt)
          );
          setCampaigns(sortedCampaigns);
        }
      } catch (error) {
        console.error('Error fetching campaigns:', error);
      } finally {
        setLoadingCampaigns(false);
      }
    };

    fetchCampaigns();
  }, [currentUser]);

  // Fetch template campaigns (public examples)
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoadingTemplates(true);
        const { httpsCallable } = await import('firebase/functions');
        const { functions } = await import('@/lib/firebase/config');

        const getTemplateCampaignsFn = httpsCallable(functions, 'getTemplateCampaigns');
        const result = await getTemplateCampaignsFn() as any;

        if (result.data.success && result.data.templates) {
          setTemplateCampaigns(result.data.templates);
        }
      } catch (error) {
        console.error('Error fetching templates:', error);
        // For now, use empty array as fallback
        setTemplateCampaigns([]);
      } finally {
        setLoadingTemplates(false);
      }
    };

    fetchTemplates();
  }, []);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'generating':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <Header user={currentUser} onLogout={handleLogout} />

      {/* Main Content */}
      <main className="max-w-[1120px] mx-auto py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        {/* Primary CTA Section */}
        <div className="mb-12 text-center">
          <button
            onClick={() => router.push('/generate?new=true')}
            className="bg-[#41b6e6] hover:bg-[#3aa5d5] text-white font-bold text-xl py-6 px-12 rounded-xl transition-all transform hover:scale-105 shadow-lg hover:shadow-xl inline-flex items-center space-x-3"
          >
            <span className="text-3xl">🎬</span>
            <span>Generate New Video</span>
          </button>
        </div>

        {/* Dashboard Grid */}
        <div className="mb-12">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Campaigns Card */}
            <div
              onClick={() => router.push('/dashboard/campaigns')}
              className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow cursor-pointer"
            >
              <dt className="text-sm font-semibold text-[#5b6068] uppercase tracking-wide mb-3">
                My Campaigns
              </dt>
              <dd className="text-4xl font-display font-bold text-[#111827] mb-4">
                {loadingCampaigns ? '...' : campaigns.length}
              </dd>
              <div className="flex flex-col space-y-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push('/dashboard/campaigns');
                  }}
                  className="text-sm font-semibold text-[#41b6e6] hover:text-[#3aa5d5] transition-colors text-left"
                >
                  View All →
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push('/generate?new=true');
                  }}
                  className="text-sm font-semibold text-[#41b6e6] hover:text-[#3aa5d5] transition-colors text-left"
                >
                  Create New →
                </button>
              </div>
            </div>

            {/* Videos Card */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <dt className="text-sm font-semibold text-[#5b6068] uppercase tracking-wide mb-3">
                Videos Generated
              </dt>
              <dd className="text-4xl font-display font-bold text-[#111827] mb-4">0</dd>
              <div>
                <button className="text-sm font-semibold text-[#41b6e6] hover:text-[#3aa5d5] transition-colors">
                  View All Videos →
                </button>
              </div>
            </div>

            {/* Credits Card */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <dt className="text-sm font-semibold text-[#5b6068] uppercase tracking-wide mb-3">
                Available Credits
              </dt>
              <dd className="text-4xl font-display font-bold text-[#111827] mb-4">100</dd>
              <div>
                <button className="text-sm font-semibold text-[#41b6e6] hover:text-[#3aa5d5] transition-colors">
                  Buy More Credits →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* My Campaigns */}
        <div className="mb-12">
          <h3 className="font-display text-2xl font-bold text-[#111827] mb-6">My Campaigns</h3>
            {loadingCampaigns ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#41b6e6]"></div>
              </div>
            ) : campaigns.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center">
                <p className="text-[#5b6068] text-lg mb-6">
                  No campaigns yet. Create your first video ad!
                </p>
                <button
                  onClick={() => router.push('/generate?new=true')}
                  className="bg-[#41b6e6] hover:bg-[#3aa5d5] text-white font-semibold py-3 px-8 rounded-lg transition-colors"
                >
                  Create Campaign
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {campaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    onClick={() => router.push(`/generate?campaignId=${campaign.id}`)}
                    className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-display text-lg font-bold text-[#111827] group-hover:text-[#41b6e6] transition-colors line-clamp-1">
                        {campaign.productName || 'Untitled Campaign'}
                      </h4>
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${getStatusColor(campaign.status)}`}>
                        {campaign.status}
                      </span>
                    </div>
                    <p className="text-sm text-[#5b6068] mb-4">
                      {campaign.currentStep ? `Step ${campaign.currentStep}` : 'Not started'}
                    </p>
                    <div className="flex items-center justify-between text-xs text-[#5b6068]">
                      <span>Created: {formatDate(campaign.createdAt)}</span>
                      <span className="text-[#41b6e6] font-semibold group-hover:underline">Open →</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>

        {/* Browse Public Campaigns Section */}
        <div className="mb-12">
          <h3 className="font-display text-2xl font-bold text-[#111827] mb-6">Browse Public Campaigns</h3>
          {loadingTemplates ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#41b6e6]"></div>
            </div>
          ) : templateCampaigns.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center">
              <p className="text-[#5b6068] text-lg">
                No example campaigns available yet. Check back soon!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {templateCampaigns.map((template) => (
                <div
                  key={template.id}
                  onClick={() => router.push(`/generate?templateId=${template.id}`)}
                  className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all cursor-pointer group relative"
                >
                  <div className="absolute top-4 right-4">
                    <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full">
                      Template
                    </span>
                  </div>
                  <div className="mb-3 pr-20">
                    <h4 className="font-display text-lg font-bold text-[#111827] group-hover:text-[#41b6e6] transition-colors line-clamp-2">
                      {template.productName || 'Untitled Template'}
                    </h4>
                  </div>
                  <p className="text-sm text-[#5b6068] mb-4">
                    {template.userEmail ? `By ${template.userEmail.split('@')[0]}` : 'Community template'}
                  </p>
                  <div className="flex items-center justify-between text-xs text-[#5b6068]">
                    <span>👁️ View-only</span>
                    <span className="text-[#41b6e6] font-semibold group-hover:underline">View & Copy →</span>
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
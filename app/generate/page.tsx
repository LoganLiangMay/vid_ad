'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { adGenerationSchema, AdGenerationFormData } from '@/lib/schemas/adGenerationSchema';
// import { useAuth } from '@/lib/contexts/AuthContext';
import AdGenerationForm from '@/components/AdGenerationForm';

export default function GeneratePage() {
  // const { user, loading } = useAuth();
  const user = true; // Temporarily bypass auth for testing
  const loading = false;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [campaignId, setCampaignId] = useState<string>('');

  const form = useForm<AdGenerationFormData>({
    resolver: zodResolver(adGenerationSchema) as any,
    defaultValues: {
      productName: '',
      productDescription: '',
      keywords: '' as any, // Schema transforms string to array
      brandTone: 'professional',
      primaryColor: '#000000',
      variations: 1,
      duration: 7,
      orientation: 'landscape',
      resolution: '1080p',
      frameRate: 30,
      videoModel: 'seedance-1-lite',
      logoFile: undefined,
      productImages: [],
      includeVoiceover: true,
      voiceStyle: 'alloy',
      includeBackgroundMusic: true,
      callToAction: '',
      targetAudience: '',
    },
  });

  // Initialize or load campaign
  useEffect(() => {
    const initializeCampaign = async () => {
      // Check if we're coming from a "Generate New Campaign" click
      const searchParams = new URLSearchParams(window.location.search);
      const isNewCampaign = searchParams.get('new') === 'true';

      if (isNewCampaign) {
        // Clear any old draft and start fresh
        console.log('🆕 Starting new campaign - clearing draft');
        localStorage.removeItem('adGenerationDraft');
        localStorage.removeItem('activeCampaignId');
        form.reset(); // Reset to default values

        // Create new campaign ID
        const newCampaignId = crypto.randomUUID();
        setCampaignId(newCampaignId);
        localStorage.setItem('activeCampaignId', newCampaignId);

        // Save initial campaign to Firestore
        await saveCampaignToFirestore(
          newCampaignId,
          {
            status: 'draft',
            currentStep: 1,
            productName: '',
          },
          true // isNew
        );

        return;
      }

      // Try to load existing campaign
      const existingCampaignId = localStorage.getItem('activeCampaignId');
      if (existingCampaignId) {
        console.log('📂 Loading existing campaign:', existingCampaignId);
        setCampaignId(existingCampaignId);

        // Load draft data
        const savedDraft = localStorage.getItem('adGenerationDraft');
        if (savedDraft) {
          try {
            const parsedDraft = JSON.parse(savedDraft);
            console.log('📝 Loading saved draft');
            form.reset(parsedDraft);
          } catch (error) {
            console.error('Failed to load draft:', error);
          }
        }
      } else {
        // Create new campaign for first-time visitors
        const newCampaignId = crypto.randomUUID();
        console.log('✨ Creating new campaign:', newCampaignId);
        setCampaignId(newCampaignId);
        localStorage.setItem('activeCampaignId', newCampaignId);

        // Save initial campaign to Firestore
        await saveCampaignToFirestore(
          newCampaignId,
          {
            status: 'draft',
            currentStep: 1,
            productName: '',
          },
          true // isNew
        );
      }
    };

    initializeCampaign();
  }, [form]);

  // Helper function to save campaign to Firestore
  const saveCampaignToFirestore = async (id: string, data: any, isNew = false) => {
    if (!id) return;

    try {
      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('@/lib/firebase/config');

      if (isNew) {
        // Use saveCampaign for new campaigns
        const saveCampaignFn = httpsCallable(functions, 'saveCampaign');
        await saveCampaignFn({
          campaignId: id,
          campaignData: {
            ...data,
            id,
            createdAt: Date.now(),
          },
        });
        console.log('✅ New campaign created in Firestore');
      } else {
        // Use updateCampaign for existing campaigns
        const updateCampaignFn = httpsCallable(functions, 'updateCampaign');
        await updateCampaignFn({
          campaignId: id,
          updates: {
            ...data,
            updatedAt: Date.now(),
          },
        });
        console.log('✅ Campaign auto-saved to Firestore');
      }
    } catch (error) {
      console.warn('⚠️ Failed to save to Firestore:', error);
    }
  };

  // Save draft to localStorage AND Firestore on form changes
  useEffect(() => {
    const subscription = form.watch((formData) => {
      localStorage.setItem('adGenerationDraft', JSON.stringify(formData));

      // Auto-save to Firestore every 2 seconds
      if (campaignId) {
        // Debounce Firestore saves
        const timeoutId = setTimeout(() => {
          saveCampaignToFirestore(campaignId, {
            ...formData,
            status: 'draft',
          });
        }, 2000);

        return () => clearTimeout(timeoutId);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, campaignId]);

  // Redirect if not authenticated
  // useEffect(() => {
  //   if (!loading && !user) {
  //     router.push('/auth/login?returnUrl=/generate');
  //   }
  // }, [user, loading, router]);

  const onSubmit = async (data: AdGenerationFormData) => {
    console.log('🎬 onSubmit called with data:', data);
    setIsSubmitting(true);

    try {
      console.log('💾 Finalizing campaign data...');

      // Use existing campaign ID
      const finalCampaignId = campaignId || crypto.randomUUID();

      // Save campaign data with unique key including concept and storyboard
      const campaignData = {
        id: finalCampaignId,
        ...data,
        // Include concept and storyboard if present
        selectedConcept: (data as any).selectedConcept,
        storyboardImages: (data as any).storyboardImages,
        status: 'generating', // Update status to generating
      };

      const campaignKey = `campaign_${finalCampaignId}`;
      localStorage.setItem(campaignKey, JSON.stringify(campaignData));

      // Update campaign in Firestore with final data
      await saveCampaignToFirestore(finalCampaignId, campaignData);

      // Clear draft after successful submission
      localStorage.removeItem('adGenerationDraft');
      localStorage.removeItem('activeCampaignId');

      console.log('✅ Campaign finalized, redirecting to video generation...');

      // Small delay to ensure state updates and show loading state
      await new Promise(resolve => setTimeout(resolve, 500));

      // Redirect to video generation/results page with campaign ID
      console.log('🔄 Navigating to /generate/results/ with campaign ID');
      window.location.href = `/generate/results/?campaignId=${finalCampaignId}`;
    } catch (error) {
      console.error('❌ Generation error:', error);
      alert('Error preparing video generation. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Generate Video Ad
          </h1>

          <AdGenerationForm
            form={form}
            onSubmit={onSubmit}
            isSubmitting={isSubmitting}
            campaignId={campaignId}
            onStepChange={(step, formData) => {
              // Save step progress to Firestore
              if (campaignId) {
                saveCampaignToFirestore(campaignId, {
                  ...formData,
                  currentStep: step,
                  status: 'draft',
                });
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
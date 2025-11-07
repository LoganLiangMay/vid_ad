'use client';

import { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase/config';

interface VideoData {
  id: string;
  url: string;
  productName?: string;
  brandTone?: string;
  duration?: number;
  metadata?: any;
}

interface WorkflowState {
  selectedVoiceType: 'default' | 'cloned' | 'clone-new' | null;
  selectedVoiceId: string | null;
  clonedVoiceName: string | null;
}

interface VoiceSelectionStepProps {
  videoData: VideoData;
  state: WorkflowState;
  updateState: (updates: Partial<WorkflowState>) => void;
  onNext: () => void;
}

interface Voice {
  id: string;
  name: string;
  description?: string;
  gender?: 'male' | 'female' | 'neutral';
  accent?: string;
  model: string;
}

interface ClonedVoice {
  id: string;
  voiceName: string;
  replicateVoiceId: string;
  replicateModel: string;
  audioUrl: string;
  createdAt: any;
  usageCount: number;
  lastUsed?: any;
}

export default function VoiceSelectionStep({
  state,
  updateState,
  onNext,
}: VoiceSelectionStepProps) {
  const [defaultVoices, setDefaultVoices] = useState<Voice[]>([]);
  const [clonedVoices, setClonedVoices] = useState<ClonedVoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [cloning, setCloning] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [newVoiceName, setNewVoiceName] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadVoices();
  }, []);

  const loadVoices = async () => {
    try {
      setLoading(true);

      // Load default voices
      const getDefaultVoices = httpsCallable(functions, 'getReplicateDefaultVoices');
      const defaultResult = await getDefaultVoices();
      const defaultData = defaultResult.data as any;
      if (defaultData.success) {
        setDefaultVoices(defaultData.voices || []);
      }

      // Load cloned voices
      const getClonedVoices = httpsCallable(functions, 'getUserClonedVoices');
      const clonedResult = await getClonedVoices();
      const clonedData = clonedResult.data as any;
      if (clonedData.success) {
        setClonedVoices(clonedData.voices || []);
      }
    } catch (error: any) {
      console.error('Error loading voices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceTypeChange = (type: 'default' | 'cloned' | 'clone-new') => {
    updateState({
      selectedVoiceType: type,
      selectedVoiceId: null,
      clonedVoiceName: null,
    });
  };

  const handleDefaultVoiceSelect = (voiceId: string) => {
    updateState({
      selectedVoiceId: voiceId,
      selectedVoiceType: 'default',
    });
  };

  const handleClonedVoiceSelect = (voiceName: string, voiceId: string) => {
    updateState({
      selectedVoiceId: voiceId,
      clonedVoiceName: voiceName,
      selectedVoiceType: 'cloned',
    });
  };

  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('audio/')) {
        alert('Please select an audio file');
        return;
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('Audio file must be less than 10MB');
        return;
      }
      setAudioFile(file);
    }
  };

  const handleCloneVoice = async () => {
    if (!audioFile || !newVoiceName.trim()) {
      alert('Please provide an audio file and voice name');
      return;
    }

    if (newVoiceName.trim().length === 0 || newVoiceName.length > 50) {
      alert('Voice name must be between 1 and 50 characters');
      return;
    }

    try {
      setCloning(true);
      setUploading(true);

      // Upload audio to Firebase Storage first
      const { getStorage, ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
      const { app } = await import('@/lib/firebase/config');
      const storageInstance = getStorage(app);

      const audioRef = ref(storageInstance, `voice-clones/${Date.now()}_${audioFile.name}`);
      await uploadBytes(audioRef, audioFile);
      const audioUrl = await getDownloadURL(audioRef);

      // Call clone function
      const cloneVoice = httpsCallable(functions, 'cloneVoice');
      const result = await cloneVoice({
        audioUrl: audioUrl,
        voiceName: newVoiceName.trim(),
      });

      const data = result.data as any;
      if (data.success) {
        // Update state with new cloned voice
        updateState({
          selectedVoiceType: 'cloned',
          selectedVoiceId: data.voiceId,
          clonedVoiceName: data.voiceName,
        });

        // Reload cloned voices
        await loadVoices();

        // Reset form
        setAudioFile(null);
        setNewVoiceName('');
        setUploading(false);
      }
    } catch (error: any) {
      console.error('Error cloning voice:', error);
      alert(error.message || 'Failed to clone voice. Please try again.');
      setUploading(false);
    } finally {
      setCloning(false);
    }
  };

  const canProceed = () => {
    if (state.selectedVoiceType === 'default') {
      return state.selectedVoiceId !== null;
    }
    if (state.selectedVoiceType === 'cloned') {
      return state.selectedVoiceId !== null && state.clonedVoiceName !== null;
    }
    if (state.selectedVoiceType === 'clone-new') {
      return state.selectedVoiceId !== null && state.clonedVoiceName !== null;
    }
    return false;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Select Voice</h2>
      <p className="text-gray-600">Choose a default voice or clone your own voice</p>

      {/* Voice Type Selection */}
      <div className="space-y-4">
        <div className="flex flex-col space-y-2">
          <label className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="voiceType"
              value="default"
              checked={state.selectedVoiceType === 'default'}
              onChange={() => handleVoiceTypeChange('default')}
              className="w-4 h-4 text-blue-600"
            />
            <div className="flex-1">
              <span className="font-semibold">Use Default Voice</span>
              <p className="text-sm text-gray-600">Choose from pre-trained Replicate voices</p>
            </div>
          </label>

          <label className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="voiceType"
              value="cloned"
              checked={state.selectedVoiceType === 'cloned'}
              onChange={() => handleVoiceTypeChange('cloned')}
              className="w-4 h-4 text-blue-600"
            />
            <div className="flex-1">
              <span className="font-semibold">Use My Cloned Voice</span>
              <p className="text-sm text-gray-600">Select from your saved voice clones</p>
            </div>
          </label>

          <label className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="voiceType"
              value="clone-new"
              checked={state.selectedVoiceType === 'clone-new'}
              onChange={() => handleVoiceTypeChange('clone-new')}
              className="w-4 h-4 text-blue-600"
            />
            <div className="flex-1">
              <span className="font-semibold">Clone New Voice</span>
              <p className="text-sm text-gray-600">Upload audio to create a new voice clone</p>
            </div>
          </label>
        </div>
      </div>

      {/* Default Voices */}
      {state.selectedVoiceType === 'default' && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">Default Voices</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {defaultVoices.map((voice) => (
              <button
                key={voice.id}
                onClick={() => handleDefaultVoiceSelect(voice.id)}
                className={`p-4 border-2 rounded-lg text-left transition-colors ${
                  state.selectedVoiceId === voice.id
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold">{voice.name}</div>
                {voice.description && (
                  <div className="text-sm text-gray-600 mt-1">{voice.description}</div>
                )}
                {voice.gender && (
                  <div className="text-xs text-gray-500 mt-2">
                    {voice.gender} • {voice.accent || 'Standard accent'}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Cloned Voices */}
      {state.selectedVoiceType === 'cloned' && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">My Cloned Voices</h3>
          {clonedVoices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No cloned voices yet.</p>
              <p className="text-sm mt-2">Select "Clone New Voice" to create one.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clonedVoices.map((voice) => (
                <button
                  key={voice.id}
                  onClick={() => handleClonedVoiceSelect(voice.voiceName, voice.replicateVoiceId)}
                  className={`p-4 border-2 rounded-lg text-left transition-colors ${
                    state.clonedVoiceName === voice.voiceName
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold">{voice.voiceName}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Used {voice.usageCount} time{voice.usageCount !== 1 ? 's' : ''}
                  </div>
                  {voice.lastUsed && (
                    <div className="text-xs text-gray-500 mt-2">
                      Last used: {new Date(voice.lastUsed.toMillis()).toLocaleDateString()}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Clone New Voice */}
      {state.selectedVoiceType === 'clone-new' && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">Clone New Voice</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Voice Name
              </label>
              <input
                type="text"
                value={newVoiceName}
                onChange={(e) => setNewVoiceName(e.target.value)}
                placeholder="e.g., My Professional Voice"
                maxLength={50}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Choose a unique name for this voice clone (1-50 characters)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Audio File
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioFileChange}
                  className="hidden"
                  id="audio-upload"
                />
                <label
                  htmlFor="audio-upload"
                  className="cursor-pointer block"
                >
                  {audioFile ? (
                    <div>
                      <p className="font-semibold text-gray-900">{audioFile.name}</p>
                      <p className="text-sm text-gray-600">
                        {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-gray-600">Click to upload audio file</p>
                      <p className="text-xs text-gray-500 mt-2">
                        Minimum 5 seconds • Max 10MB • MP3, WAV, or M4A
                      </p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <button
              onClick={handleCloneVoice}
              disabled={!audioFile || !newVoiceName.trim() || cloning}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cloning ? 'Cloning Voice...' : 'Clone Voice'}
            </button>

            {uploading && (
              <div className="text-sm text-blue-600 text-center">
                Uploading and processing audio...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-end pt-6 border-t">
        <button
          onClick={onNext}
          disabled={!canProceed()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next: Enter Script
        </button>
      </div>
    </div>
  );
}


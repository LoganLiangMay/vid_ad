'use client';

import { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase/config';
import Link from 'next/link';

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

export default function VoicesPage() {
  const [clonedVoices, setClonedVoices] = useState<ClonedVoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    loadClonedVoices();
  }, []);

  const loadClonedVoices = async () => {
    try {
      setLoading(true);
      const getClonedVoices = httpsCallable(functions, 'getUserClonedVoices');
      const result = await getClonedVoices();
      const data = result.data as any;
      if (data.success) {
        setClonedVoices(data.voices || []);
      }
    } catch (error: any) {
      console.error('Error loading cloned voices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (voiceName: string) => {
    if (!confirm(`Are you sure you want to delete "${voiceName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleting(voiceName);
      const deleteVoice = httpsCallable(functions, 'deleteClonedVoice');
      await deleteVoice({ voiceName });
      await loadClonedVoices();
    } catch (error: any) {
      console.error('Error deleting voice:', error);
      alert(error.message || 'Failed to delete voice');
    } finally {
      setDeleting(null);
    }
  };

  const handleRename = async (oldName: string) => {
    if (!newName.trim() || newName.trim() === oldName) {
      setRenaming(null);
      setNewName('');
      return;
    }

    try {
      setRenaming(oldName);
      const renameVoice = httpsCallable(functions, 'renameClonedVoice');
      await renameVoice({ oldName, newName: newName.trim() });
      await loadClonedVoices();
      setRenaming(null);
      setNewName('');
    } catch (error: any) {
      console.error('Error renaming voice:', error);
      alert(error.message || 'Failed to rename voice');
      setRenaming(null);
    }
  };

  const startRename = (voiceName: string) => {
    setRenaming(voiceName);
    setNewName(voiceName);
  };

  const cancelRename = () => {
    setRenaming(null);
    setNewName('');
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
              <h1 className="text-xl font-semibold text-gray-900">My Voice Library</h1>
            </div>
            <div className="flex items-center space-x-4">
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
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Cloned Voices</h2>
            <p className="text-gray-600">
              Manage your voice clones. You can rename, preview, or delete them.
            </p>
          </div>

          {clonedVoices.length === 0 ? (
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
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">No cloned voices yet</h3>
              <p className="mt-2 text-sm text-gray-500">
                Create your first voice clone when adding a voiceover to a video.
              </p>
              <div className="mt-6">
                <Link
                  href="/generate"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Generate Video
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {clonedVoices.map((voice) => (
                <div
                  key={voice.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden"
                >
                  <div className="p-6">
                    {renaming === voice.voiceName ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          maxLength={50}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleRename(voice.voiceName);
                            } else if (e.key === 'Escape') {
                              cancelRename();
                            }
                          }}
                        />
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleRename(voice.voiceName)}
                            className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelRename}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {voice.voiceName}
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                              Model: {voice.replicateModel.split('/')[1] || 'Unknown'}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Usage Count:</span>
                            <span className="font-semibold">{voice.usageCount}</span>
                          </div>
                          {voice.lastUsed && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Last Used:</span>
                              <span className="text-gray-900">
                                {new Date(voice.lastUsed.toMillis()).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Created:</span>
                            <span className="text-gray-900">
                              {new Date(voice.createdAt.toMillis()).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* Preview Audio */}
                        {voice.audioUrl && (
                          <div className="mb-4">
                            <p className="text-xs text-gray-500 mb-2">Original Audio:</p>
                            <audio controls className="w-full" src={voice.audioUrl} />
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex space-x-2">
                          <button
                            onClick={() => startRename(voice.voiceName)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
                          >
                            Rename
                          </button>
                          <button
                            onClick={() => handleDelete(voice.voiceName)}
                            disabled={deleting === voice.voiceName}
                            className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm"
                          >
                            {deleting === voice.voiceName ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </>
                    )}
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


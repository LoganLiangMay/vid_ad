'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function DashboardPage() {
  const router = useRouter();
  const { currentUser, logout, loading } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <nav className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-foreground">AI Video Ad Generator</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-foreground">{currentUser?.email}</span>
              <button
                onClick={handleLogout}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-card border border-border overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Welcome to AI Video Ad Generator!
              </h2>
              <p className="text-muted-foreground">
                Start creating professional video advertisements with the power of AI.
              </p>
            </div>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Campaigns Card */}
            <div className="bg-card border border-border overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-muted-foreground truncate">My Campaigns</dt>
                <dd className="mt-1 text-3xl font-semibold text-foreground">-</dd>
                <div className="mt-3 flex space-x-2">
                  <button
                    onClick={() => router.push('/dashboard/campaigns')}
                    className="text-sm text-primary hover:text-primary/80 transition-colors"
                  >
                    View All →
                  </button>
                  <button
                    onClick={() => router.push('/generate')}
                    className="text-sm text-primary hover:text-primary/80 transition-colors"
                  >
                    Create New →
                  </button>
                </div>
              </div>
            </div>

            {/* Videos Card */}
            <div className="bg-card border border-border overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-muted-foreground truncate">Videos Generated</dt>
                <dd className="mt-1 text-3xl font-semibold text-foreground">0</dd>
                <div className="mt-3">
                  <button className="text-sm text-primary hover:text-primary/80 transition-colors">
                    View All Videos →
                  </button>
                </div>
              </div>
            </div>

            {/* Credits Card */}
            <div className="bg-card border border-border overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-muted-foreground truncate">Available Credits</dt>
                <dd className="mt-1 text-3xl font-semibold text-foreground">100</dd>
                <div className="mt-3">
                  <button className="text-sm text-primary hover:text-primary/80 transition-colors">
                    Buy More Credits →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="px-4 py-6 sm:px-0">
          <h3 className="text-lg font-medium text-foreground mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <button
              onClick={() => router.push('/generate')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 px-4 rounded-lg transition-colors flex flex-col items-center"
            >
              <span className="text-2xl mb-1">🎬</span>
              Generate Video with AI
            </button>
            <button className="bg-card hover:bg-card/80 text-foreground font-medium py-3 px-4 rounded-lg border border-border transition-colors flex flex-col items-center">
              <span className="text-2xl mb-1">📚</span>
              Browse Templates
            </button>
          </div>
        </div>

        {/* Account Info */}
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-primary/10 border-l-4 border-primary p-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-foreground">
                  Your session will remain active until you logout.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
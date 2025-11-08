'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import Header from '@/components/Header';

export default function ProfilePage() {
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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#41b6e6]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header user={currentUser} onLogout={handleLogout} />

      <main className="max-w-[1120px] mx-auto py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-[#111827] mb-2">Profile Settings</h1>
          <p className="text-[#5b6068]">Manage your account settings and preferences</p>
        </div>

        {/* Profile Section */}
        <div className="bg-white border border-gray-200 rounded-xl p-8 mb-6">
          <h2 className="font-display text-xl font-bold text-[#111827] mb-6">Account Information</h2>

          <div className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-[#5b6068] mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={currentUser?.email || ''}
                disabled
                className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-[#111827]"
              />
              <p className="text-xs text-[#5b6068] mt-1">Your email address cannot be changed</p>
            </div>

            {/* User ID */}
            <div>
              <label className="block text-sm font-semibold text-[#5b6068] mb-2">
                User ID
              </label>
              <input
                type="text"
                value={currentUser?.uid || ''}
                disabled
                className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-[#111827] font-mono text-sm"
              />
            </div>

            {/* Account Status */}
            <div>
              <label className="block text-sm font-semibold text-[#5b6068] mb-2">
                Account Status
              </label>
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Preferences Section */}
        <div className="bg-white border border-gray-200 rounded-xl p-8 mb-6">
          <h2 className="font-display text-xl font-bold text-[#111827] mb-6">Preferences</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <p className="text-sm font-semibold text-[#111827]">Email Notifications</p>
                <p className="text-xs text-[#5b6068]">Receive updates about your campaigns</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#41b6e6]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#41b6e6]"></div>
              </label>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <p className="text-sm font-semibold text-[#111827]">Marketing Emails</p>
                <p className="text-xs text-[#5b6068]">Receive tips and updates about new features</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#41b6e6]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#41b6e6]"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white border border-red-200 rounded-xl p-8">
          <h2 className="font-display text-xl font-bold text-red-600 mb-6">Danger Zone</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-semibold text-[#111827]">Delete Account</p>
                <p className="text-xs text-[#5b6068]">Permanently delete your account and all data</p>
              </div>
              <button className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors text-sm font-semibold">
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

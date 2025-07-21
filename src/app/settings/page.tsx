'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import SettingsModal from '@/components/settings/SettingsModal';

export default function SettingsPage() {
  const [isModalOpen, setIsModalOpen] = useState(true);

  const handleClose = () => {
    setIsModalOpen(false);
    // Navigate back to previous page
    window.history.back();
  };

  return (
    <DashboardLayout currentPage="settings">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">System Settings</h1>
          <p className="text-slate-600 mb-6">
            Configure your system preferences and account settings. Changes are automatically saved.
          </p>
          
          <div className="text-center py-12">
            <p className="text-slate-500 mb-4">Settings interface will open in a modal</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Open Settings
            </button>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal isOpen={isModalOpen} onClose={handleClose} />
    </DashboardLayout>
  );
}
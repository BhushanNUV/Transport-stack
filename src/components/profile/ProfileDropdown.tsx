'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  User, 
  ChevronDown, 
  Shield
} from 'lucide-react';

export default function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleProfileClick = () => {
    setIsOpen(false);
    // Navigate to profile page
    window.location.href = '/profile';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 text-slate-700 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
      >
        <div className="h-8 w-8 gradient-primary rounded-full flex items-center justify-center text-white font-semibold shadow-sm">
          <span className="text-xs">{user?.name?.[0]?.toUpperCase() || 'U'}</span>
        </div>
        <div className="hidden lg:block text-left">
          <p className="text-sm font-medium">{user?.name || 'User'}</p>
          <p className="text-xs text-slate-500">{user?.role || 'Admin'}</p>
        </div>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 z-50">
          {/* Profile Header */}
          <div className="px-4 py-3 border-b border-slate-200">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 gradient-primary rounded-full flex items-center justify-center text-white font-semibold shadow-sm">
                <span className="text-sm">{user?.name?.[0]?.toUpperCase() || 'U'}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">{user?.name || 'User'}</p>
                <p className="text-xs text-slate-500">{user?.email || 'user@example.com'}</p>
              </div>
            </div>
          </div>

          {/* My Profile Button */}
          <div className="p-2">
            <button
              onClick={handleProfileClick}
              className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center space-x-3 transition-colors rounded-md"
            >
              <User className="h-4 w-4" />
              <span>My Profile</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
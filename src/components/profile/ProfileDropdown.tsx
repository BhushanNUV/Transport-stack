'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  User, 
  Settings, 
  LogOut, 
  ChevronDown, 
  Shield, 
  Bell, 
  Moon, 
  Sun, 
  Globe,
  Lock,
  HelpCircle
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

  const handleSettingsClick = () => {
    setIsOpen(false);
    // Navigate to settings page
    window.location.href = '/settings';
  };

  const handleLogout = () => {
    setIsOpen(false);
    logout();
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
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-slate-200 z-50">
          {/* Profile Header */}
          <div className="px-4 py-3 border-b border-slate-200">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 gradient-primary rounded-full flex items-center justify-center text-white font-semibold shadow-sm">
                <span className="text-sm">{user?.name?.[0]?.toUpperCase() || 'U'}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">{user?.name || 'User'}</p>
                <p className="text-xs text-slate-500">{user?.email || 'user@example.com'}</p>
                <div className="flex items-center space-x-1 mt-1">
                  <Shield className="h-3 w-3 text-blue-500" />
                  <span className="text-xs text-blue-600 font-medium">{user?.role || 'Admin'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <button
              onClick={handleProfileClick}
              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center space-x-3 transition-colors"
            >
              <User className="h-4 w-4" />
              <span>My Profile</span>
            </button>

            <button
              onClick={handleSettingsClick}
              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center space-x-3 transition-colors"
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                // Toggle notifications settings
              }}
              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center space-x-3 transition-colors"
            >
              <Bell className="h-4 w-4" />
              <span>Notifications</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                // Toggle theme
              }}
              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center space-x-3 transition-colors"
            >
              <Moon className="h-4 w-4" />
              <span>Dark Mode</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                // Open language settings
              }}
              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center space-x-3 transition-colors"
            >
              <Globe className="h-4 w-4" />
              <span>Language</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                // Open security settings
              }}
              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center space-x-3 transition-colors"
            >
              <Lock className="h-4 w-4" />
              <span>Security</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                // Open help center
              }}
              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center space-x-3 transition-colors"
            >
              <HelpCircle className="h-4 w-4" />
              <span>Help Center</span>
            </button>
          </div>

          {/* Logout Section */}
          <div className="border-t border-slate-200 py-1">
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 hover:text-red-700 flex items-center space-x-3 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
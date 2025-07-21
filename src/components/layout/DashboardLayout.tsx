'use client';

import { useState, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import NotificationDropdown from '@/components/notifications/NotificationDropdown';
import ProfileDropdown from '@/components/profile/ProfileDropdown';
import SettingsModal from '@/components/settings/SettingsModal';
import {
  Users,
  Calendar,
  Activity,
  Settings,
  LogOut,
  Menu,
  X,
  Heart,
  Home,
} from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
  currentPage?: string;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  current: boolean;
}

export default function DashboardLayout({ children, currentPage = 'dashboard' }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { user, logout } = useAuth();

  const navigation: NavigationItem[] = [
    { name: 'Dashboard', href: '/', icon: Home, current: currentPage === 'dashboard' },
    { name: 'Drivers', href: '/drivers', icon: Users, current: currentPage === 'drivers' },
    { name: 'Health Reports', href: '/health', icon: Heart, current: currentPage === 'health' },
    { name: 'Attendance', href: '/attendance', icon: Calendar, current: currentPage === 'attendance' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Mobile sidebar */}
      <div className={`relative z-50 lg:hidden ${sidebarOpen ? '' : 'hidden'}`} role="dialog" aria-modal="true">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)}></div>

        <div className="fixed inset-0 flex">
          <div className="relative mr-16 flex w-full max-w-xs flex-1">
            <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
              <button
                type="button"
                className="-m-2.5 p-2.5 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="sr-only">Close sidebar</span>
                <X className="h-6 w-6 text-white" aria-hidden="true" />
              </button>
            </div>

            <div className="flex grow flex-col overflow-y-auto bg-white/95 backdrop-blur-xl border-r border-white/20 animate-slide-in">
              <div className="flex shrink-0 items-center px-6 pt-6 pb-4 mt-4 border-b border-slate-200/60">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 gradient-primary rounded-xl flex items-center justify-center shadow-lg">
                    <Activity className="h-6 w-6 text-white" />
                  </div>
                  <div className="leading-tight">
                    <div className="text-xl font-bold bg-gradient-to-r from-slate-900 to-blue-700 bg-clip-text text-transparent">NUAI</div>
                    <div className="text-sm font-medium text-slate-600 -mt-1">Driver Health</div>
                  </div>
                </div>
              </div>
              <nav className="flex flex-1 flex-col px-6 pt-6 pb-4">
                <ul role="list" className="flex flex-1 flex-col gap-y-7">
                  <li>
                    <ul role="list" className="-mx-2 space-y-2">
                      {navigation.map((item) => (
                        <li key={item.name}>
                          <a
                            href={item.href}
                            className={`group flex gap-x-3 rounded-xl p-3 text-sm leading-6 font-medium transition-all duration-200 ${
                              item.current
                                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                                : 'text-slate-700 hover:text-blue-700 hover:bg-blue-50/80 hover:shadow-sm'
                            }`}
                          >
                            <item.icon
                              className={`h-5 w-5 shrink-0 transition-colors ${
                                item.current ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'
                              }`}
                              aria-hidden="true"
                            />
                            {item.name}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </li>
                  <li className="mt-auto">
                    <div className="flex items-center gap-x-4 py-4 text-sm font-medium leading-6 text-slate-900 border-t border-slate-200/60">
                      <div className="h-10 w-10 gradient-primary rounded-full flex items-center justify-center text-white font-semibold shadow-lg">
                        <span className="text-sm">{user?.name?.[0]?.toUpperCase() || 'U'}</span>
                      </div>
                      <span className="sr-only">Your profile</span>
                      <div className="flex-1">
                        <span aria-hidden="true" className="block font-semibold">{user?.name || 'User'}</span>
                        <span className="text-xs text-slate-500">{user?.email}</span>
                      </div>
                      <button 
                        onClick={logout}
                        className="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors"
                        title="Logout"
                      >
                        <LogOut className="h-5 w-5" />
                      </button>
                    </div>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-80 lg:flex-col">
        <div className="flex grow flex-col overflow-y-auto bg-white/95 backdrop-blur-xl border-r border-slate-200/60 shadow-xl">
          <div className="flex h-[73px] shrink-0 items-center px-6 border-b border-slate-200/60">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 gradient-primary rounded-xl flex items-center justify-center shadow-lg">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <div className="leading-tight">
                <div className="text-xl font-bold bg-gradient-to-r from-slate-900 to-blue-700 bg-clip-text text-transparent">NUAI</div>
                <div className="text-sm font-medium text-slate-600 -mt-1">Driver Health</div>
              </div>
            </div>
          </div>
          <nav className="flex flex-1 flex-col px-6 pt-6">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-2">
                  {navigation.map((item) => (
                    <li key={item.name}>
                      <a
                        href={item.href}
                        className={`group flex gap-x-3 rounded-xl p-3 text-sm leading-6 font-medium transition-all duration-200 ${
                          item.current
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                            : 'text-slate-700 hover:text-blue-700 hover:bg-blue-50/80 hover:shadow-sm'
                        }`}
                      >
                        <item.icon
                          className={`h-5 w-5 shrink-0 transition-colors ${
                            item.current ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'
                          }`}
                          aria-hidden="true"
                        />
                        {item.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </li>
              <li className="mt-auto">
                <div className="flex items-center gap-x-4 py-4 text-sm font-medium leading-6 text-slate-900 border-t border-slate-200/60">
                  <div className="h-10 w-10 gradient-primary rounded-full flex items-center justify-center text-white font-semibold shadow-lg">
                    <span className="text-sm">{user?.name?.[0]?.toUpperCase() || 'U'}</span>
                  </div>
                  <span className="sr-only">Your profile</span>
                  <div className="flex-1">
                    <span aria-hidden="true" className="block font-semibold">{user?.name || 'User'}</span>
                    <span className="text-xs text-slate-500">{user?.email}</span>
                  </div>
                  <button 
                    onClick={logout}
                    className="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors"
                    title="Logout"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Header for all screen sizes */}
      <div className="sticky top-0 z-40 flex items-center gap-x-6 bg-white/95 backdrop-blur-xl px-4 py-4 shadow-sm border-b border-slate-200/60 sm:px-6 lg:pl-80">
        <button
          type="button"
          className="-m-2.5 p-2.5 text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors lg:hidden"
          onClick={() => setSidebarOpen(true)}
        >
          <span className="sr-only">Open sidebar</span>
          <Menu className="h-6 w-6" aria-hidden="true" />
        </button>
        
        {/* Page title and breadcrumb */}
        <div className="flex-1 lg:ml-6">
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-semibold text-slate-900 capitalize">
              {currentPage === 'dashboard' ? 'NUAI\'s Driver Health Dashboard' : currentPage.replace('-', ' ')}
            </h1>
            {currentPage !== 'dashboard' && (
              <>
                <span className="text-slate-400">/</span>
                <span className="text-sm text-slate-600 capitalize">{currentPage.replace('-', ' ')}</span>
              </>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Welcome back, {user?.name || 'User'}! Here's your overview for today.
          </p>
        </div>

        {/* Header actions */}
        <div className="flex items-center space-x-3">
          <NotificationDropdown />
          <button 
            onClick={() => setSettingsOpen(true)}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Settings className="h-5 w-5" />
          </button>
          
          {/* User profile dropdown - desktop only */}
          <div className="hidden sm:flex items-center ml-3 pl-3 border-l border-slate-200">
            <ProfileDropdown />
          </div>
        </div>
      </div>

      <main className="py-8 lg:pl-80">
        <div className="px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>

      {/* Settings Modal */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  Heart, 
  Calendar, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Activity,
  Shield,
  Clock,
  CheckCircle,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import HealthAlerts from './HealthAlerts';

interface DashboardStats {
  totalDrivers: number;
  activeToday: number;
  healthAlerts: number;
  attendanceRate: number;
  avgHealthScore: number;
  criticalCases: number;
}

interface RecentActivity {
  id: string;
  type: 'check-in' | 'health-alert' | 'attendance' | 'safety';
  message: string;
  time: string;
  driverName: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalDrivers: 0,
    activeToday: 0,
    healthAlerts: 0,
    attendanceRate: 0,
    avgHealthScore: 0,
    criticalCases: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
        setError(null);
      }

      const response = await fetch('/api/dashboard/stats', {
        cache: 'no-store', // Always fetch fresh data
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard data: ${response.status}`);
      }

      const data = await response.json();
      
      setStats(data.stats);
      setRecentActivity(data.recentActivity || []);
      setError(null);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load dashboard data');
      
      // Only set fallback values on initial load, not refresh
      if (!isRefresh) {
        setStats({
          totalDrivers: 0,
          activeToday: 0,
          healthAlerts: 0,
          attendanceRate: 0,
          avgHealthScore: 0,
          criticalCases: 0,
        });
        setRecentActivity([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchDashboardData(true);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'check-in':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'health-alert':
        return <Heart className="h-5 w-5 text-red-500" />;
      case 'safety':
        return <Shield className="h-5 w-5 text-yellow-500" />;
      case 'attendance':
        return <Clock className="h-5 w-5 text-blue-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div className="text-center lg:text-left mb-4 lg:mb-0">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-800 bg-clip-text text-transparent mb-2">
            Fleet Health Dashboard
          </h1>
          <p className="text-slate-600 text-lg">Real-time insights into driver health and safety metrics</p>
        </div>
        
        <div className="flex items-center justify-center lg:justify-end space-x-4">
          {error && (
            <div className="flex items-center text-red-600 bg-red-50 px-3 py-2 rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 mr-2" />
              <span>Data load error</span>
            </div>
          )}
          
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors ${refreshing ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="group bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-600 mb-2">Total Drivers</p>
              <p className="text-3xl font-bold text-slate-900 mb-3">{stats.totalDrivers}</p>
              <div className="flex items-center text-sm">
                <div className="flex items-center text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  <span className="font-medium">+2 this month</span>
                </div>
              </div>
            </div>
            <div className="h-12 w-12 gradient-primary rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
              <Users className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>

        <div className="group bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-600 mb-2">Active Today</p>
              <p className="text-3xl font-bold text-slate-900 mb-3">{stats.activeToday}</p>
              <div className="flex items-center text-sm">
                <div className="flex items-center text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  <span className="font-medium">+5 from yesterday</span>
                </div>
              </div>
            </div>
            <div className="h-12 w-12 gradient-success rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
              <CheckCircle className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>

        <div className="group bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-600 mb-2">Health Alerts</p>
              <p className="text-3xl font-bold text-slate-900 mb-3">{stats.healthAlerts}</p>
              <div className="flex items-center text-sm">
                <div className="flex items-center text-rose-600 bg-rose-50 px-2 py-1 rounded-full">
                  <TrendingDown className="h-4 w-4 mr-1" />
                  <span className="font-medium">-1 from yesterday</span>
                </div>
              </div>
            </div>
            <div className="h-12 w-12 gradient-error rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
              <AlertTriangle className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>

        <div className="group bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-600 mb-2">Attendance Rate</p>
              <p className="text-3xl font-bold text-slate-900 mb-3">{stats.attendanceRate}%</p>
              <div className="flex items-center text-sm">
                <div className="flex items-center text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  <span className="font-medium">+2.1% this week</span>
                </div>
              </div>
            </div>
            <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
              <Calendar className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="group bg-white border border-slate-200 rounded-xl p-8 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-600 mb-2">Average Health Score</p>
              <p className="text-3xl font-bold text-slate-900 mb-4">{stats.avgHealthScore}<span className="text-lg text-slate-500">/100</span></p>
              <div className="relative">
                <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                  <div 
                    className="gradient-primary h-3 rounded-full transition-all duration-1000 ease-out shadow-lg" 
                    style={{ width: `${stats.avgHealthScore}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-slate-500 mt-2">
                  <span>Poor</span>
                  <span>Good</span>
                  <span>Excellent</span>
                </div>
              </div>
            </div>
            <div className="h-12 w-12 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow ml-6">
              <Heart className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>

        <div className="group bg-white border border-slate-200 rounded-xl p-8 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-600 mb-2">Critical Cases</p>
              <p className="text-3xl font-bold text-slate-900 mb-2">{stats.criticalCases}</p>
              <p className="text-sm text-slate-500 bg-amber-50 px-3 py-1 rounded-full inline-block">
                Require immediate attention
              </p>
            </div>
            <div className="h-12 w-12 gradient-warning rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow ml-6">
              <Shield className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="xl:col-span-1">
          <div className="bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-6 border-b border-slate-200/60">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                <Activity className="h-5 w-5 mr-2 text-blue-600" />
                Recent Activity
              </h3>
              <p className="text-sm text-slate-600 mt-1">Latest fleet updates</p>
            </div>
            <div className="p-6 bg-white">
              <div className="flow-root">
                <ul className="-mb-8">
                  {recentActivity.map((activity, activityIdx) => (
                    <li key={activity.id}>
                      <div className="relative pb-8">
                        {activityIdx !== recentActivity.length - 1 ? (
                          <span
                            className="absolute left-5 top-8 -ml-px h-full w-0.5 bg-gradient-to-b from-blue-200 to-transparent"
                            aria-hidden="true"
                          />
                        ) : null}
                        <div className="relative flex space-x-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md border-2 border-white">
                            {getActivityIcon(activity.type)}
                          </div>
                          <div className="flex min-w-0 flex-1 justify-between space-x-4">
                            <div>
                              <p className="text-sm text-slate-900 leading-relaxed">
                                <span className="font-semibold text-slate-700">{activity.driverName}</span>{' '}
                                <span className="text-slate-600">{activity.message}</span>
                              </p>
                            </div>
                            <div className="whitespace-nowrap text-right text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                              {activity.time}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Health Alerts */}
        <div className="xl:col-span-2">
          <HealthAlerts />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-8">
        <div className="text-center mb-6">
          <h3 className="text-xl font-semibold text-slate-900 mb-2">Quick Actions</h3>
          <p className="text-slate-600">Streamline your fleet management workflow</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="group flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl hover:shadow-xl hover:scale-105 transition-all duration-300">
            <div className="h-12 w-12 bg-white/20 rounded-full flex items-center justify-center mb-3 group-hover:bg-white/30 transition-colors">
              <Users className="h-6 w-6" />
            </div>
            <span className="text-sm font-medium">Add Driver</span>
          </button>
          <button className="group flex flex-col items-center justify-center p-6 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-xl hover:shadow-xl hover:scale-105 transition-all duration-300">
            <div className="h-12 w-12 bg-white/20 rounded-full flex items-center justify-center mb-3 group-hover:bg-white/30 transition-colors">
              <Heart className="h-6 w-6" />
            </div>
            <span className="text-sm font-medium">Health Checkup</span>
          </button>
          <button className="group flex flex-col items-center justify-center p-6 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-xl hover:shadow-xl hover:scale-105 transition-all duration-300">
            <div className="h-12 w-12 bg-white/20 rounded-full flex items-center justify-center mb-3 group-hover:bg-white/30 transition-colors">
              <Calendar className="h-6 w-6" />
            </div>
            <span className="text-sm font-medium">Mark Attendance</span>
          </button>
          <button className="group flex flex-col items-center justify-center p-6 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-xl hover:shadow-xl hover:scale-105 transition-all duration-300">
            <div className="h-12 w-12 bg-white/20 rounded-full flex items-center justify-center mb-3 group-hover:bg-white/30 transition-colors">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <span className="text-sm font-medium">Create Alert</span>
          </button>
        </div>
      </div>
    </div>
  );
}
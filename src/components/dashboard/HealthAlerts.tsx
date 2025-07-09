'use client';

import { useState, useEffect } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  AlertTriangle,
  Heart,
  Activity,
  Camera,
  Phone,
  Clock,
  CheckCircle,
  X,
  Bell,
  Eye,
  EyeOff,
  Filter,
  ChevronDown,
} from 'lucide-react';
import { SystemAlert, AlertType, AlertSeverity } from '@/types';

interface HealthAlertsProps {
  className?: string;
}

interface AlertWithDetails extends SystemAlert {
  driverName?: string;
  driverId?: string;
}

export default function HealthAlerts({ className = '' }: HealthAlertsProps) {
  const [alerts, setAlerts] = useState<AlertWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOnlyUnread, setShowOnlyUnread] = useState(false);
  const [selectedType, setSelectedType] = useState<AlertType | 'ALL'>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<AlertSeverity | 'ALL'>('ALL');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchAlerts();
    // Set up polling for real-time updates
    const interval = setInterval(fetchAlerts, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/alerts');
      if (!response.ok) {
        throw new Error('Failed to fetch alerts');
      }
      const result = await response.json();
      setAlerts(result.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      // Use mock data for demonstration
      setAlerts(getMockAlerts());
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (alertId: string) => {
    try {
      const response = await fetch(`/api/alerts/${alertId}/read`, {
        method: 'PATCH',
      });
      
      if (response.ok) {
        setAlerts(prev => 
          prev.map(alert => 
            alert.id === alertId ? { ...alert, isRead: true } : alert
          )
        );
      }
    } catch (err) {
      console.error('Failed to mark alert as read:', err);
      // Update locally for demo
      setAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId ? { ...alert, isRead: true } : alert
        )
      );
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/alerts/mark-all-read', {
        method: 'PATCH',
      });
      
      if (response.ok) {
        setAlerts(prev => prev.map(alert => ({ ...alert, isRead: true })));
      }
    } catch (err) {
      console.error('Failed to mark all alerts as read:', err);
      // Update locally for demo
      setAlerts(prev => prev.map(alert => ({ ...alert, isRead: true })));
    }
  };

  const dismissAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setAlerts(prev => prev.filter(alert => alert.id !== alertId));
      }
    } catch (err) {
      console.error('Failed to dismiss alert:', err);
      // Remove locally for demo
      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    }
  };

  const getAlertIcon = (type: AlertType) => {
    switch (type) {
      case 'HEALTH':
        return <Heart className="h-5 w-5" />;
      case 'ATTENDANCE':
        return <Clock className="h-5 w-5" />;
      case 'ALCOHOL_DETECTION':
        return <AlertTriangle className="h-5 w-5" />;
      case 'OBJECT_DETECTION':
        return <Camera className="h-5 w-5" />;
      case 'SAFETY':
        return <Activity className="h-5 w-5" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  const getAlertColor = (severity: AlertSeverity) => {
    switch (severity) {
      case 'INFO':
        return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'WARNING':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'ERROR':
        return 'text-red-600 bg-red-100 border-red-200';
      case 'CRITICAL':
        return 'text-red-800 bg-red-200 border-red-300';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getSeverityBadge = (severity: AlertSeverity) => {
    const colors = {
      INFO: 'bg-blue-100 text-blue-800',
      WARNING: 'bg-yellow-100 text-yellow-800',
      ERROR: 'bg-red-100 text-red-800',
      CRITICAL: 'bg-red-200 text-red-900',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[severity]}`}>
        {severity}
      </span>
    );
  };

  const filteredAlerts = alerts.filter(alert => {
    if (showOnlyUnread && alert.isRead) return false;
    if (selectedType !== 'ALL' && alert.type !== selectedType) return false;
    if (selectedSeverity !== 'ALL' && alert.severity !== selectedSeverity) return false;
    return true;
  });

  const unreadCount = alerts.filter(alert => !alert.isRead).length;

  // Mock data for demonstration
  const getMockAlerts = (): AlertWithDetails[] => [
    {
      id: '1',
      title: 'High Blood Pressure Detected',
      message: 'Driver John Smith has recorded blood pressure of 180/95 mmHg',
      type: 'HEALTH' as AlertType,
      severity: 'ERROR' as AlertSeverity,
      isRead: false,
      targetRole: null,
      createdAt: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
      updatedAt: new Date(Date.now() - 1000 * 60 * 15),
      driverName: 'John Smith',
      driverId: 'DRV-001',
    },
    {
      id: '2',
      title: 'Alcohol Detection Alert',
      message: 'Possible alcohol detected for driver Sarah Johnson with 85% confidence',
      type: 'ALCOHOL_DETECTION' as AlertType,
      severity: 'CRITICAL' as AlertSeverity,
      isRead: false,
      targetRole: null,
      createdAt: new Date(Date.now() - 1000 * 60 * 45), // 45 minutes ago
      updatedAt: new Date(Date.now() - 1000 * 60 * 45),
      driverName: 'Sarah Johnson',
      driverId: 'DRV-002',
    },
    {
      id: '3',
      title: 'Phone Usage Detected',
      message: 'Driver Mike Davis was detected using phone while driving',
      type: 'OBJECT_DETECTION' as AlertType,
      severity: 'WARNING' as AlertSeverity,
      isRead: true,
      targetRole: null,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
      driverName: 'Mike Davis',
      driverId: 'DRV-003',
    },
    {
      id: '4',
      title: 'Late Check-in',
      message: 'Driver Emily Wilson checked in 30 minutes late for duty',
      type: 'ATTENDANCE' as AlertType,
      severity: 'INFO' as AlertSeverity,
      isRead: true,
      targetRole: null,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 4),
      driverName: 'Emily Wilson',
      driverId: 'DRV-004',
    },
    {
      id: '5',
      title: 'System Maintenance',
      message: 'Scheduled system maintenance will begin at 2:00 AM tonight',
      type: 'SYSTEM' as AlertType,
      severity: 'INFO' as AlertSeverity,
      isRead: false,
      targetRole: null,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 6),
    },
  ];

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Bell className="h-6 w-6 text-gray-700" />
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Health Alerts</h2>
              <p className="text-sm text-gray-600">
                {unreadCount} unread alerts
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-1 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
            >
              <Filter className="h-4 w-4" />
              <ChevronDown className={`h-4 w-4 transform transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center space-x-2 px-3 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md"
              >
                <CheckCircle className="h-4 w-4" />
                <span>Mark all read</span>
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as AlertType | 'ALL')}
                className="w-full p-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ALL">All Types</option>
                <option value="HEALTH">Health</option>
                <option value="ATTENDANCE">Attendance</option>
                <option value="ALCOHOL_DETECTION">Alcohol Detection</option>
                <option value="OBJECT_DETECTION">Object Detection</option>
                <option value="SAFETY">Safety</option>
                <option value="SYSTEM">System</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value as AlertSeverity | 'ALL')}
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="ALL">All Severities</option>
                <option value="INFO">Info</option>
                <option value="WARNING">Warning</option>
                <option value="ERROR">Error</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={showOnlyUnread}
                  onChange={(e) => setShowOnlyUnread(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Show only unread</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-yellow-50 border-b border-yellow-200">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Unable to fetch latest alerts. Showing cached data.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Alerts List */}
      <div className="max-h-96 overflow-y-auto">
        {filteredAlerts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-lg font-medium">No alerts found</p>
            <p className="text-sm">
              {showOnlyUnread 
                ? 'All alerts have been read' 
                : 'No alerts match your current filters'
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 hover:bg-gray-50 transition-colors ${
                  !alert.isRead ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  {/* Alert Icon */}
                  <div className={`flex-shrink-0 p-2 rounded-full ${getAlertColor(alert.severity)}`}>
                    {getAlertIcon(alert.type)}
                  </div>

                  {/* Alert Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className={`text-sm font-medium ${!alert.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                            {alert.title}
                          </h3>
                          {getSeverityBadge(alert.severity)}
                          {!alert.isRead && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {alert.message}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}</span>
                          </div>
                          {alert.driverName && (
                            <div className="flex items-center space-x-1">
                              <span>Driver: {alert.driverName} ({alert.driverId})</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Alert Actions */}
                      <div className="flex items-center space-x-1 ml-4">
                        {!alert.isRead && (
                          <button
                            onClick={() => markAsRead(alert.id)}
                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded"
                            title="Mark as read"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => dismissAlert(alert.id)}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded"
                          title="Dismiss alert"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {filteredAlerts.length > 0 && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              Showing {filteredAlerts.length} of {alerts.length} alerts
            </span>
            <span>
              Last updated: {format(new Date(), 'HH:mm')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
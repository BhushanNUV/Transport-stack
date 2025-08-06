'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { Notification, NotificationContextType } from '@/types';

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

// Default organization ID for demo purposes
const DEFAULT_ORG_ID = 'org_default';

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [lastFetch, setLastFetch] = useState<Date>(new Date());

  // Fetch notifications from the API
  const fetchNotifications = useCallback(async () => {
    try {
      // Fetch notifications with sync from recent alerts
      const response = await fetch(`/api/notifications?syncAlerts=true&limit=50&organizationId=${DEFAULT_ORG_ID}`);
      if (response.ok) {
        const data = await response.json();
        const apiNotifications = data.data || [];
        
        // Convert API notifications to context format
        const formattedNotifications: Notification[] = apiNotifications.map((notif: any) => ({
          id: notif.id,
          title: notif.title,
          message: notif.message,
          type: notif.type,
          timestamp: new Date(notif.timestamp),
          read: notif.read,
          driverId: notif.driverId,
          actionUrl: notif.actionUrl
        }));
        
        setNotifications(formattedNotifications);
        setLastFetch(new Date());
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, []);

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchNotifications, 30000);
    
    // Initial fetch
    fetchNotifications();
    
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (id: string) => {
    try {
      // Update on server
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
      });
      
      if (response.ok) {
        // Update local state
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === id 
              ? { ...notification, read: true }
              : notification
          )
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      // Update on server
      const response = await fetch(`/api/notifications/mark-all-read?organizationId=${DEFAULT_ORG_ID}`, {
        method: 'PATCH',
      });
      
      if (response.ok) {
        // Update local state
        setNotifications(prev => 
          prev.map(notification => ({ ...notification, read: true }))
        );
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const addNotification = async (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    try {
      // Create on server
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...notification,
          organizationId: DEFAULT_ORG_ID,
        }),
      });
      
      if (response.ok) {
        // Refresh notifications
        await fetchNotifications();
      }
    } catch (error) {
      console.error('Error adding notification:', error);
    }
  };

  const removeNotification = async (id: string) => {
    try {
      // Delete on server
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Update local state
        setNotifications(prev => prev.filter(notification => notification.id !== id));
      }
    } catch (error) {
      console.error('Error removing notification:', error);
    }
  };

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    addNotification,
    removeNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
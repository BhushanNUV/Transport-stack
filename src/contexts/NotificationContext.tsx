'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { Notification, NotificationContextType } from '@/types';

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [lastAlertCheck, setLastAlertCheck] = useState<Date>(new Date());

  // Poll for new alerts and convert to notifications
  const fetchNewAlerts = useCallback(async () => {
    try {
      const response = await fetch(`/api/alerts?createdAfter=${lastAlertCheck.toISOString()}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        const newAlerts = data.data || [];
        
        // Convert alerts to notifications
        newAlerts.forEach((alert: any) => {
          if (alert.metadata?.sendNotification !== false) {
            const notification: Notification = {
              id: `alert-${alert.id}`,
              title: alert.title,
              message: alert.message,
              type: alert.severity === 'CRITICAL' ? 'error' : 
                    alert.severity === 'WARNING' ? 'warning' : 'info',
              timestamp: new Date(alert.createdAt),
              read: false,
              driverId: alert.metadata?.driverId,
              actionUrl: alert.type === 'HEALTH' ? '/health' : '/alerts'
            };
            
            setNotifications(prev => {
              // Check if notification already exists
              if (prev.some(n => n.id === notification.id)) {
                return prev;
              }
              return [notification, ...prev];
            });
          }
        });
        
        if (newAlerts.length > 0) {
          setLastAlertCheck(new Date());
        }
      }
    } catch (error) {
      console.error('Error fetching alerts for notifications:', error);
    }
  }, [lastAlertCheck]);

  // Poll for new alerts every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchNewAlerts, 30000);
    
    // Initial fetch
    fetchNewAlerts();
    
    return () => clearInterval(interval);
  }, [fetchNewAlerts]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
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
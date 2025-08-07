import fs from 'fs';
import path from 'path';

export interface StoredNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: Date;
  read: boolean;
  driverId?: string;
  actionUrl?: string;
  organizationId: string;
  alertId?: string; // Link to the original alert if created from an alert
  metadata?: any;
}

class NotificationStorage {
  private notifications: StoredNotification[] = [];
  private filePath: string;
  private initialized: boolean = false;

  constructor() {
    // Store notifications in a JSON file - use /tmp in production for write permissions
    const isProduction = process.env.NODE_ENV === 'production';
    const dataDir = isProduction ? '/tmp' : process.cwd();
    this.filePath = path.join(dataDir, 'notifications-data.json');
    
    console.log(`[NotificationStorage] Using file path: ${this.filePath}`);
    console.log(`[NotificationStorage] Environment: ${process.env.NODE_ENV}`);
    
    this.loadNotifications();
  }

  private loadNotifications(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(data);
        // Convert date strings back to Date objects
        this.notifications = parsed.map((notification: any) => ({
          ...notification,
          timestamp: new Date(notification.timestamp),
        }));
        console.log(`[NotificationStorage] Loaded ${this.notifications.length} notifications from file`);
      } else {
        console.log('[NotificationStorage] No existing notifications file found, creating new one');
        this.notifications = [];
        this.saveNotifications();
      }
      this.initialized = true;
    } catch (error) {
      console.error('[NotificationStorage] Error loading notifications from file:', error);
      console.error('[NotificationStorage] File path:', this.filePath);
      this.notifications = [];
      this.initialized = true;
      // Try to create the file anyway
      try {
        this.saveNotifications();
      } catch (saveError) {
        console.error('[NotificationStorage] Could not create notifications file:', saveError);
      }
    }
  }

  private saveNotifications(): void {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(this.filePath, JSON.stringify(this.notifications, null, 2));
      console.log(`[NotificationStorage] Saved ${this.notifications.length} notifications to file`);
    } catch (error) {
      console.error('[NotificationStorage] Error saving notifications to file:', error);
      console.error('[NotificationStorage] File path:', this.filePath);
    }
  }

  public createNotification(data: Omit<StoredNotification, 'id' | 'timestamp'>): StoredNotification {
    const notification: StoredNotification = {
      ...data,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };
    
    this.notifications.push(notification);
    this.saveNotifications();
    return notification;
  }

  public createFromAlert(alert: any, organizationId: string): StoredNotification | null {
    // Check if notification for this alert already exists
    if (this.notifications.some(n => n.alertId === alert.id)) {
      return null;
    }

    // Don't create notification if sendNotification is explicitly false
    if (alert.metadata?.sendNotification === false) {
      return null;
    }

    const notification = this.createNotification({
      title: alert.title,
      message: alert.message,
      type: alert.severity === 'CRITICAL' || alert.severity === 'ERROR' ? 'error' : 
            alert.severity === 'WARNING' ? 'warning' : 
            alert.severity === 'INFO' ? 'info' : 'success',
      read: false,
      driverId: alert.metadata?.driverId,
      actionUrl: alert.type === 'HEALTH' ? '/health' : 
                 alert.type === 'ATTENDANCE' ? '/attendance' :
                 alert.type === 'ALCOHOL_DETECTION' || alert.type === 'SAFETY' ? '/monitoring' :
                 '/alerts',
      organizationId,
      alertId: alert.id,
      metadata: alert.metadata
    });

    return notification;
  }

  public getNotifications(filters?: {
    organizationId?: string;
    read?: boolean;
    driverId?: string;
    createdAfter?: Date;
    limit?: number;
    offset?: number;
  }): { notifications: StoredNotification[]; total: number } {
    let filteredNotifications = [...this.notifications];

    if (filters?.organizationId) {
      filteredNotifications = filteredNotifications.filter(n => n.organizationId === filters.organizationId);
    }

    if (filters?.read !== undefined) {
      filteredNotifications = filteredNotifications.filter(n => n.read === filters.read);
    }

    if (filters?.driverId) {
      filteredNotifications = filteredNotifications.filter(n => n.driverId === filters.driverId);
    }

    if (filters?.createdAfter) {
      filteredNotifications = filteredNotifications.filter(n => n.timestamp >= filters.createdAfter);
    }

    // Sort by timestamp descending (newest first)
    filteredNotifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const total = filteredNotifications.length;

    // Apply pagination
    if (filters?.offset !== undefined && filters?.limit !== undefined) {
      filteredNotifications = filteredNotifications.slice(filters.offset, filters.offset + filters.limit);
    } else if (filters?.limit !== undefined) {
      filteredNotifications = filteredNotifications.slice(0, filters.limit);
    }

    return { notifications: filteredNotifications, total };
  }

  public getNotificationById(id: string): StoredNotification | null {
    return this.notifications.find(n => n.id === id) || null;
  }

  public updateNotification(id: string, updates: Partial<Omit<StoredNotification, 'id' | 'timestamp'>>): StoredNotification | null {
    const index = this.notifications.findIndex(n => n.id === id);
    if (index === -1) return null;

    this.notifications[index] = {
      ...this.notifications[index],
      ...updates,
    };

    this.saveNotifications();
    return this.notifications[index];
  }

  public deleteNotification(id: string): boolean {
    const index = this.notifications.findIndex(n => n.id === id);
    if (index === -1) return false;

    this.notifications.splice(index, 1);
    this.saveNotifications();
    return true;
  }

  public markAsRead(id: string): StoredNotification | null {
    return this.updateNotification(id, { read: true });
  }

  public markAllAsRead(organizationId: string): number {
    let count = 0;
    this.notifications = this.notifications.map(notification => {
      if (notification.organizationId === organizationId && !notification.read) {
        count++;
        return { ...notification, read: true };
      }
      return notification;
    });
    
    if (count > 0) {
      this.saveNotifications();
    }
    
    return count;
  }

  public clearOldNotifications(daysToKeep: number = 7): number {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    const initialCount = this.notifications.length;
    
    this.notifications = this.notifications.filter(notification => notification.timestamp >= cutoffDate);
    
    const removedCount = initialCount - this.notifications.length;
    if (removedCount > 0) {
      this.saveNotifications();
    }
    
    return removedCount;
  }

  // Get unread count for organization
  public getUnreadCount(organizationId: string): number {
    return this.notifications.filter(n => 
      n.organizationId === organizationId && !n.read
    ).length;
  }

  // Sync notifications from alerts
  public syncFromAlerts(alerts: any[], organizationId: string): number {
    let created = 0;
    
    for (const alert of alerts) {
      const notification = this.createFromAlert(alert, organizationId);
      if (notification) {
        created++;
      }
    }
    
    return created;
  }
}

// Create a singleton instance
const notificationStorage = new NotificationStorage();

export default notificationStorage;
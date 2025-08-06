import { AlertType, AlertSeverity } from '@prisma/client';
import fs from 'fs';
import path from 'path';

export interface StoredAlert {
  id: string;
  title: string;
  message: string;
  type: AlertType;
  severity: AlertSeverity;
  isRead: boolean;
  targetRole: string | null;
  organizationId: string;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

class AlertStorage {
  private alerts: StoredAlert[] = [];
  private filePath: string;
  private initialized: boolean = false;

  constructor() {
    // Store alerts in a JSON file in the project root
    this.filePath = path.join(process.cwd(), 'alerts-data.json');
    this.loadAlerts();
  }

  private loadAlerts(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(data);
        // Convert date strings back to Date objects
        this.alerts = parsed.map((alert: any) => ({
          ...alert,
          createdAt: new Date(alert.createdAt),
          updatedAt: new Date(alert.updatedAt),
        }));
      } else {
        this.alerts = [];
        this.saveAlerts();
      }
      this.initialized = true;
    } catch (error) {
      console.error('Error loading alerts from file:', error);
      this.alerts = [];
      this.initialized = true;
    }
  }

  private saveAlerts(): void {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.alerts, null, 2));
    } catch (error) {
      console.error('Error saving alerts to file:', error);
    }
  }

  public createAlert(data: Omit<StoredAlert, 'id' | 'createdAt' | 'updatedAt'>): StoredAlert {
    const alert: StoredAlert = {
      ...data,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.alerts.push(alert);
    this.saveAlerts();
    return alert;
  }

  public getAlerts(filters?: {
    organizationId?: string;
    type?: AlertType;
    severity?: AlertSeverity;
    isRead?: boolean;
    createdAfter?: Date;
    limit?: number;
    offset?: number;
  }): { alerts: StoredAlert[]; total: number } {
    let filteredAlerts = [...this.alerts];

    if (filters?.organizationId) {
      filteredAlerts = filteredAlerts.filter(a => a.organizationId === filters.organizationId);
    }

    if (filters?.type) {
      filteredAlerts = filteredAlerts.filter(a => a.type === filters.type);
    }

    if (filters?.severity) {
      filteredAlerts = filteredAlerts.filter(a => a.severity === filters.severity);
    }

    if (filters?.isRead !== undefined) {
      filteredAlerts = filteredAlerts.filter(a => a.isRead === filters.isRead);
    }

    if (filters?.createdAfter) {
      filteredAlerts = filteredAlerts.filter(a => a.createdAt >= filters.createdAfter);
    }

    // Sort by createdAt descending (newest first)
    filteredAlerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = filteredAlerts.length;

    // Apply pagination
    if (filters?.offset !== undefined && filters?.limit !== undefined) {
      filteredAlerts = filteredAlerts.slice(filters.offset, filters.offset + filters.limit);
    } else if (filters?.limit !== undefined) {
      filteredAlerts = filteredAlerts.slice(0, filters.limit);
    }

    return { alerts: filteredAlerts, total };
  }

  public getAlertById(id: string): StoredAlert | null {
    return this.alerts.find(a => a.id === id) || null;
  }

  public updateAlert(id: string, updates: Partial<Omit<StoredAlert, 'id' | 'createdAt'>>): StoredAlert | null {
    const index = this.alerts.findIndex(a => a.id === id);
    if (index === -1) return null;

    this.alerts[index] = {
      ...this.alerts[index],
      ...updates,
      updatedAt: new Date(),
    };

    this.saveAlerts();
    return this.alerts[index];
  }

  public deleteAlert(id: string): boolean {
    const index = this.alerts.findIndex(a => a.id === id);
    if (index === -1) return false;

    this.alerts.splice(index, 1);
    this.saveAlerts();
    return true;
  }

  public markAsRead(id: string): StoredAlert | null {
    return this.updateAlert(id, { isRead: true });
  }

  public markAllAsRead(organizationId: string): number {
    let count = 0;
    this.alerts = this.alerts.map(alert => {
      if (alert.organizationId === organizationId && !alert.isRead) {
        count++;
        return { ...alert, isRead: true, updatedAt: new Date() };
      }
      return alert;
    });
    
    if (count > 0) {
      this.saveAlerts();
    }
    
    return count;
  }

  public checkForDuplicateAlert(
    organizationId: string,
    type: AlertType,
    titleContains: string,
    withinMinutes: number = 60
  ): boolean {
    const cutoffTime = new Date(Date.now() - withinMinutes * 60 * 1000);
    
    return this.alerts.some(alert => 
      alert.organizationId === organizationId &&
      alert.type === type &&
      alert.title.includes(titleContains) &&
      alert.createdAt >= cutoffTime
    );
  }

  public clearOldAlerts(daysToKeep: number = 30): number {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    const initialCount = this.alerts.length;
    
    this.alerts = this.alerts.filter(alert => alert.createdAt >= cutoffDate);
    
    const removedCount = initialCount - this.alerts.length;
    if (removedCount > 0) {
      this.saveAlerts();
    }
    
    return removedCount;
  }

  // Get statistics for dashboard
  public getAlertStats(organizationId: string): {
    total: number;
    unread: number;
    critical: number;
    byType: Record<AlertType, number>;
    bySeverity: Record<AlertSeverity, number>;
  } {
    const orgAlerts = this.alerts.filter(a => a.organizationId === organizationId);
    
    const stats = {
      total: orgAlerts.length,
      unread: orgAlerts.filter(a => !a.isRead).length,
      critical: orgAlerts.filter(a => a.severity === AlertSeverity.CRITICAL).length,
      byType: {} as Record<AlertType, number>,
      bySeverity: {} as Record<AlertSeverity, number>,
    };

    // Count by type
    for (const type of Object.values(AlertType)) {
      stats.byType[type] = orgAlerts.filter(a => a.type === type).length;
    }

    // Count by severity
    for (const severity of Object.values(AlertSeverity)) {
      stats.bySeverity[severity] = orgAlerts.filter(a => a.severity === severity).length;
    }

    return stats;
  }
}

// Create a singleton instance
const alertStorage = new AlertStorage();

export default alertStorage;
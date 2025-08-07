import { NextRequest, NextResponse } from 'next/server';
import alertStorage from '@/lib/alertStorage';
import notificationStorage from '@/lib/notificationStorage';
import { AlertType, AlertSeverity } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// Default organization ID for demo purposes
const DEFAULT_ORG_ID = 'org_default';

// GET /api/storage/init - Check storage status and file paths
export async function GET() {
  try {
    // Check environment and file paths
    const isProduction = process.env.NODE_ENV === 'production';
    const dataDir = isProduction ? '/tmp' : process.cwd();
    const alertsPath = path.join(dataDir, 'alerts-data.json');
    const notificationsPath = path.join(dataDir, 'notifications-data.json');

    // Check if files exist and are readable/writable
    const alertsExists = fs.existsSync(alertsPath);
    const notificationsExists = fs.existsSync(notificationsPath);
    
    let alertsReadable = false;
    let alertsWritable = false;
    let notificationsReadable = false;
    let notificationsWritable = false;
    
    if (alertsExists) {
      try {
        fs.accessSync(alertsPath, fs.constants.R_OK);
        alertsReadable = true;
      } catch {}
      try {
        fs.accessSync(alertsPath, fs.constants.W_OK);
        alertsWritable = true;
      } catch {}
    }
    
    if (notificationsExists) {
      try {
        fs.accessSync(notificationsPath, fs.constants.R_OK);
        notificationsReadable = true;
      } catch {}
      try {
        fs.accessSync(notificationsPath, fs.constants.W_OK);
        notificationsWritable = true;
      } catch {}
    }

    // Get current counts
    const { alerts } = alertStorage.getAlerts({ organizationId: DEFAULT_ORG_ID });
    const { notifications } = notificationStorage.getNotifications({ organizationId: DEFAULT_ORG_ID });

    return NextResponse.json({
      success: true,
      environment: {
        NODE_ENV: process.env.NODE_ENV || 'development',
        isProduction,
        dataDir,
        cwd: process.cwd(),
      },
      storage: {
        alerts: {
          path: alertsPath,
          exists: alertsExists,
          readable: alertsReadable,
          writable: alertsWritable,
          count: alerts.length,
        },
        notifications: {
          path: notificationsPath,
          exists: notificationsExists,
          readable: notificationsReadable,
          writable: notificationsWritable,
          count: notifications.length,
        },
      },
    });
  } catch (error) {
    console.error('Error checking storage status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check storage status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST /api/storage/init - Initialize storage with sample data
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';
    const organizationId = searchParams.get('organizationId') || DEFAULT_ORG_ID;

    // Check current counts
    const { alerts: existingAlerts } = alertStorage.getAlerts({ organizationId });
    const { notifications: existingNotifications } = notificationStorage.getNotifications({ organizationId });

    if (!force && (existingAlerts.length > 0 || existingNotifications.length > 0)) {
      return NextResponse.json({
        success: false,
        message: 'Storage already contains data. Use ?force=true to reinitialize.',
        data: {
          existingAlerts: existingAlerts.length,
          existingNotifications: existingNotifications.length,
        },
      });
    }

    // Create initial alerts
    const initialAlerts = [
      {
        title: 'System Initialized',
        message: 'Alert and notification system has been initialized successfully',
        type: AlertType.SYSTEM,
        severity: AlertSeverity.INFO,
      },
      {
        title: 'Welcome to Driver Health Dashboard',
        message: 'Your monitoring system is now active and ready to track driver health metrics',
        type: AlertType.SYSTEM,
        severity: AlertSeverity.INFO,
      },
      {
        title: 'Health Monitoring Active',
        message: 'Real-time health monitoring is now enabled for all drivers',
        type: AlertType.HEALTH,
        severity: AlertSeverity.INFO,
      },
    ];

    const createdAlerts = [];
    for (const alertData of initialAlerts) {
      const alert = alertStorage.createAlert({
        ...alertData,
        organizationId,
        isRead: false,
        targetRole: null,
        metadata: {
          isInitialData: true,
          createdBy: 'system-init',
        },
      });
      createdAlerts.push(alert);

      // Create corresponding notification
      notificationStorage.createFromAlert(alert, organizationId);
    }

    // Create some standalone notifications
    const directNotifications = [
      {
        title: 'Dashboard Ready',
        message: 'Your dashboard is configured and ready to use',
        type: 'success' as const,
        actionUrl: '/dashboard',
      },
      {
        title: 'Configure Settings',
        message: 'Remember to configure your alert thresholds in settings',
        type: 'info' as const,
        actionUrl: '/settings',
      },
    ];

    const createdNotifications = [];
    for (const notifData of directNotifications) {
      const notification = notificationStorage.createNotification({
        ...notifData,
        organizationId,
        read: false,
        metadata: {
          isInitialData: true,
          createdBy: 'system-init',
        },
      });
      createdNotifications.push(notification);
    }

    // Get final counts
    const { alerts: finalAlerts } = alertStorage.getAlerts({ organizationId });
    const { notifications: finalNotifications } = notificationStorage.getNotifications({ organizationId });

    return NextResponse.json({
      success: true,
      message: 'Storage initialized successfully',
      data: {
        alertsCreated: createdAlerts.length,
        notificationsCreated: createdNotifications.length + createdAlerts.length,
        totalAlerts: finalAlerts.length,
        totalNotifications: finalNotifications.length,
      },
    });
  } catch (error) {
    console.error('Error initializing storage:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to initialize storage',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// DELETE /api/storage/init - Clear all storage data
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const confirm = searchParams.get('confirm') === 'true';

    if (!confirm) {
      return NextResponse.json({
        success: false,
        message: 'Please confirm deletion by adding ?confirm=true',
      });
    }

    // Clear by removing files and reinitializing
    const isProduction = process.env.NODE_ENV === 'production';
    const dataDir = isProduction ? '/tmp' : process.cwd();
    const alertsPath = path.join(dataDir, 'alerts-data.json');
    const notificationsPath = path.join(dataDir, 'notifications-data.json');

    let alertsDeleted = false;
    let notificationsDeleted = false;

    try {
      if (fs.existsSync(alertsPath)) {
        fs.unlinkSync(alertsPath);
        alertsDeleted = true;
      }
    } catch (error) {
      console.error('Error deleting alerts file:', error);
    }

    try {
      if (fs.existsSync(notificationsPath)) {
        fs.unlinkSync(notificationsPath);
        notificationsDeleted = true;
      }
    } catch (error) {
      console.error('Error deleting notifications file:', error);
    }

    return NextResponse.json({
      success: true,
      message: 'Storage cleared',
      data: {
        alertsDeleted,
        notificationsDeleted,
      },
    });
  } catch (error) {
    console.error('Error clearing storage:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to clear storage',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
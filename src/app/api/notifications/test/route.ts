import { NextRequest, NextResponse } from 'next/server';
import notificationStorage from '@/lib/notificationStorage';
import alertStorage from '@/lib/alertStorage';

// Default organization ID for demo purposes
const DEFAULT_ORG_ID = 'org_default';

// POST /api/notifications/test - Create test notifications and sync from alerts
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    const organizationId = searchParams.get('organizationId') || DEFAULT_ORG_ID;

    const notifications = [];

    // Sync from existing alerts
    const { alerts } = alertStorage.getAlerts({ organizationId });
    const syncedCount = notificationStorage.syncFromAlerts(alerts, organizationId);

    if (type === 'direct' || type === 'all') {
      // Create direct notifications
      const infoNotif = notificationStorage.createNotification({
        title: 'System Update',
        message: 'The system has been updated successfully',
        type: 'info',
        read: false,
        organizationId,
        actionUrl: '/dashboard',
      });
      notifications.push(infoNotif);

      const warningNotif = notificationStorage.createNotification({
        title: 'Maintenance Scheduled',
        message: 'System maintenance is scheduled for tonight at 2 AM',
        type: 'warning',
        read: false,
        organizationId,
        actionUrl: '/alerts',
      });
      notifications.push(warningNotif);

      const successNotif = notificationStorage.createNotification({
        title: 'Report Generated',
        message: 'Monthly health report has been generated successfully',
        type: 'success',
        read: false,
        organizationId,
        actionUrl: '/health',
        driverId: 'test-driver-1',
      });
      notifications.push(successNotif);

      const errorNotif = notificationStorage.createNotification({
        title: 'Critical Alert',
        message: 'Multiple health parameters out of range',
        type: 'error',
        read: false,
        organizationId,
        actionUrl: '/health',
        driverId: 'test-driver-2',
      });
      notifications.push(errorNotif);
    }

    // Get all notifications for this organization
    const { notifications: allNotifications } = notificationStorage.getNotifications({ organizationId });

    return NextResponse.json({
      success: true,
      message: `Created test notifications of type: ${type}`,
      data: {
        newNotifications: notifications.length,
        syncedFromAlerts: syncedCount,
        totalNotifications: allNotifications.length
      }
    });
  } catch (error) {
    console.error('Error creating test notifications:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create test notifications',
      },
      { status: 500 }
    );
  }
}

// GET /api/notifications/test - Get notification statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId') || DEFAULT_ORG_ID;

    const { notifications, total } = notificationStorage.getNotifications({ organizationId });
    const unreadCount = notificationStorage.getUnreadCount(organizationId);

    const stats = {
      total,
      unread: unreadCount,
      read: total - unreadCount,
      byType: {
        info: notifications.filter(n => n.type === 'info').length,
        warning: notifications.filter(n => n.type === 'warning').length,
        error: notifications.filter(n => n.type === 'error').length,
        success: notifications.filter(n => n.type === 'success').length,
      }
    };

    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting notification stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get notification stats',
      },
      { status: 500 }
    );
  }
}
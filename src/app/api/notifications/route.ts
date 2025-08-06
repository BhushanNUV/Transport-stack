import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, PaginatedResponse } from '@/types';
import notificationStorage from '@/lib/notificationStorage';
import alertStorage from '@/lib/alertStorage';

// Default organization ID for demo purposes
const DEFAULT_ORG_ID = 'org_default';

// GET /api/notifications - Get notifications with pagination and filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const read = searchParams.get('read');
    const driverId = searchParams.get('driverId') || '';
    const createdAfter = searchParams.get('createdAfter');
    const organizationId = searchParams.get('organizationId') || DEFAULT_ORG_ID;
    const syncAlerts = searchParams.get('syncAlerts') === 'true';

    const offset = (page - 1) * limit;

    // Optionally sync notifications from recent alerts
    if (syncAlerts) {
      const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
      const { alerts } = alertStorage.getAlerts({
        organizationId,
        createdAfter: cutoffDate,
      });
      notificationStorage.syncFromAlerts(alerts, organizationId);
    }

    // Get filtered notifications from storage
    const { notifications, total } = notificationStorage.getNotifications({
      organizationId,
      read: read !== null && read !== undefined && read !== '' ? read === 'true' : undefined,
      driverId: driverId || undefined,
      createdAfter: createdAfter ? new Date(createdAfter) : undefined,
      limit,
      offset,
    });

    const response: PaginatedResponse<any> = {
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    return NextResponse.json({
      success: true,
      ...response,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch notifications',
      },
      { status: 500 }
    );
  }
}

// POST /api/notifications - Create a new notification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      message,
      type,
      driverId,
      actionUrl,
      organizationId,
      metadata,
    } = body;

    // Use default organization ID if not provided
    const orgId = organizationId || DEFAULT_ORG_ID;

    // Validate required fields
    if (!title || !message || !type) {
      return NextResponse.json(
        {
          success: false,
          error: 'Title, message, and type are required',
        },
        { status: 400 }
      );
    }

    // Create notification in storage
    const notification = notificationStorage.createNotification({
      title,
      message,
      type,
      read: false,
      driverId,
      actionUrl,
      organizationId: orgId,
      metadata: metadata || {},
    });

    const response: ApiResponse<any> = {
      success: true,
      data: notification,
      message: 'Notification created successfully',
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create notification',
      },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications - Clear old notifications
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const daysToKeep = parseInt(searchParams.get('daysToKeep') || '7');

    const removed = notificationStorage.clearOldNotifications(daysToKeep);

    return NextResponse.json({
      success: true,
      message: `Removed ${removed} old notifications`,
      data: { removed },
    });
  } catch (error) {
    console.error('Error clearing old notifications:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to clear old notifications',
      },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import notificationStorage from '@/lib/notificationStorage';
import { ApiResponse } from '@/types';

// DELETE /api/notifications/[id] - Delete a notification
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const success = notificationStorage.deleteNotification(id);

    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Notification not found',
        },
        { status: 404 }
      );
    }

    const response: ApiResponse<null> = {
      success: true,
      data: null,
      message: 'Notification deleted successfully',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete notification',
      },
      { status: 500 }
    );
  }
}

// GET /api/notifications/[id] - Get a single notification
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const notification = notificationStorage.getNotificationById(id);

    if (!notification) {
      return NextResponse.json(
        {
          success: false,
          error: 'Notification not found',
        },
        { status: 404 }
      );
    }

    const response: ApiResponse<any> = {
      success: true,
      data: notification,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching notification:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch notification',
      },
      { status: 500 }
    );
  }
}
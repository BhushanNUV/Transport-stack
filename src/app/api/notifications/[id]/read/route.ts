import { NextRequest, NextResponse } from 'next/server';
import notificationStorage from '@/lib/notificationStorage';
import { ApiResponse } from '@/types';

// PATCH /api/notifications/[id]/read - Mark a notification as read
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const notification = notificationStorage.markAsRead(id);

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
      message: 'Notification marked as read',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to mark notification as read',
      },
      { status: 500 }
    );
  }
}
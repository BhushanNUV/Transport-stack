import { NextRequest, NextResponse } from 'next/server';
import notificationStorage from '@/lib/notificationStorage';
import { ApiResponse } from '@/types';

// Default organization ID for demo purposes
const DEFAULT_ORG_ID = 'org_default';

// PATCH /api/notifications/mark-all-read - Mark all notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId') || DEFAULT_ORG_ID;
    
    // Mark all unread notifications as read for the organization
    const count = notificationStorage.markAllAsRead(organizationId);

    const response: ApiResponse<{ count: number }> = {
      success: true,
      data: { count },
      message: `Marked ${count} notifications as read`,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to mark all notifications as read',
      },
      { status: 500 }
    );
  }
}
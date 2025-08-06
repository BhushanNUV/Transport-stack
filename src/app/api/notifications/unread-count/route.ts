import { NextRequest, NextResponse } from 'next/server';
import notificationStorage from '@/lib/notificationStorage';
import { ApiResponse } from '@/types';

// Default organization ID for demo purposes
const DEFAULT_ORG_ID = 'org_default';

// GET /api/notifications/unread-count - Get unread notification count
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId') || DEFAULT_ORG_ID;
    
    const count = notificationStorage.getUnreadCount(organizationId);

    const response: ApiResponse<{ count: number }> = {
      success: true,
      data: { count },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error getting unread notification count:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get unread notification count',
      },
      { status: 500 }
    );
  }
}
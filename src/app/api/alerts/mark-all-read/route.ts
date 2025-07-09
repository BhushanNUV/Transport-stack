import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiResponse } from '@/types';

// PATCH /api/alerts/mark-all-read - Mark all alerts as read
export async function PATCH() {
  try {
    // Mark all unread alerts as read
    const result = await prisma.systemAlert.updateMany({
      where: { isRead: false },
      data: { isRead: true },
    });

    const response: ApiResponse<{ count: number }> = {
      success: true,
      data: { count: result.count },
      message: `Marked ${result.count} alerts as read`,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error marking all alerts as read:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to mark all alerts as read',
      },
      { status: 500 }
    );
  }
}
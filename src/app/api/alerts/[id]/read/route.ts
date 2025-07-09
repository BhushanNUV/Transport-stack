import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiResponse } from '@/types';

// PATCH /api/alerts/[id]/read - Mark an alert as read
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if alert exists
    const existingAlert = await prisma.systemAlert.findUnique({
      where: { id },
    });

    if (!existingAlert) {
      return NextResponse.json(
        {
          success: false,
          error: 'Alert not found',
        },
        { status: 404 }
      );
    }

    // Mark alert as read
    const alert = await prisma.systemAlert.update({
      where: { id },
      data: { isRead: true },
    });

    const response: ApiResponse<any> = {
      success: true,
      data: alert,
      message: 'Alert marked as read',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error marking alert as read:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to mark alert as read',
      },
      { status: 500 }
    );
  }
}
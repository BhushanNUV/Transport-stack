import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiResponse } from '@/types';

// DELETE /api/alerts/[id] - Delete an alert
export async function DELETE(
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

    // Delete alert
    await prisma.systemAlert.delete({
      where: { id },
    });

    const response: ApiResponse<null> = {
      success: true,
      data: null,
      message: 'Alert deleted successfully',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error deleting alert:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete alert',
      },
      { status: 500 }
    );
  }
}
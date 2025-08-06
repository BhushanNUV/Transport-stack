import { NextRequest, NextResponse } from 'next/server';
import alertStorage from '@/lib/alertStorage';
import { ApiResponse } from '@/types';

// DELETE /api/alerts/[id] - Delete an alert
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const success = alertStorage.deleteAlert(id);

    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Alert not found',
        },
        { status: 404 }
      );
    }

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
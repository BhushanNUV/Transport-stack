import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiResponse } from '@/types';

// POST /api/attendance/check-out - Check out a driver
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { driverId } = body;

    if (!driverId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Driver ID is required',
        },
        { status: 400 }
      );
    }

    // Check if driver exists
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
    });

    if (!driver) {
      return NextResponse.json(
        {
          success: false,
          error: 'Driver not found',
        },
        { status: 404 }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find today's attendance record
    const attendanceRecord = await prisma.attendanceRecord.findFirst({
      where: {
        driverId,
        date: today,
      },
    });

    if (!attendanceRecord) {
      return NextResponse.json(
        {
          success: false,
          error: 'No check-in record found for today',
        },
        { status: 404 }
      );
    }

    if (!attendanceRecord.checkInTime) {
      return NextResponse.json(
        {
          success: false,
          error: 'Driver has not checked in yet',
        },
        { status: 409 }
      );
    }

    if (attendanceRecord.checkOutTime) {
      return NextResponse.json(
        {
          success: false,
          error: 'Driver has already checked out today',
        },
        { status: 409 }
      );
    }

    // Calculate working hours
    const checkOutTime = new Date();
    const workingHours = (checkOutTime.getTime() - attendanceRecord.checkInTime.getTime()) / (1000 * 60 * 60);

    // Update attendance record with check-out time
    const updatedRecord = await prisma.attendanceRecord.update({
      where: { id: attendanceRecord.id },
      data: {
        checkOutTime,
        workingHours,
      },
      include: {
        driver: {
          select: {
            id: true,
            driverId: true,
            name: true,
            email: true,
            phone: true,
            age: true,
            gender: true,
            profilePhoto: true,
          },
        },
      },
    });

    const response: ApiResponse<any> = {
      success: true,
      data: updatedRecord,
      message: 'Check-out successful',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error during check-out:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check out',
      },
      { status: 500 }
    );
  }
}
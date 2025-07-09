import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiResponse } from '@/types';

// POST /api/attendance/check-in - Check in a driver
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

    // Check if there's already an attendance record for today
    const existingRecord = await prisma.attendanceRecord.findFirst({
      where: {
        driverId,
        date: today,
      },
    });

    if (existingRecord) {
      if (existingRecord.checkInTime) {
        return NextResponse.json(
          {
            success: false,
            error: 'Driver has already checked in today',
          },
          { status: 409 }
        );
      }

      // Update existing record with check-in time
      const updatedRecord = await prisma.attendanceRecord.update({
        where: { id: existingRecord.id },
        data: {
          checkInTime: new Date(),
          status: 'PRESENT',
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

      return NextResponse.json({
        success: true,
        data: updatedRecord,
        message: 'Check-in successful',
      });
    }

    // Create new attendance record with check-in
    const attendanceRecord = await prisma.attendanceRecord.create({
      data: {
        driverId,
        date: today,
        checkInTime: new Date(),
        status: 'PRESENT',
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
      data: attendanceRecord,
      message: 'Check-in successful',
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error during check-in:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check in',
      },
      { status: 500 }
    );
  }
}
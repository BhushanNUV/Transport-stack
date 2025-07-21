import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiResponse, PaginatedResponse } from '@/types';

// GET /api/attendance - Get attendance records based on monitoring sessions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status') || '';
    const driverId = searchParams.get('driverId') || '';

    const skip = (page - 1) * limit;

    // Set date range - default to today if no dates provided
    let queryStartDate: Date;
    let queryEndDate: Date;

    if (startDate && endDate) {
      queryStartDate = new Date(startDate);
      queryEndDate = new Date(endDate);
      queryEndDate.setHours(23, 59, 59, 999); // End of day
    } else if (startDate) {
      queryStartDate = new Date(startDate);
      queryEndDate = new Date(startDate);
      queryEndDate.setHours(23, 59, 59, 999);
    } else if (endDate) {
      queryStartDate = new Date(endDate);
      queryEndDate = new Date(endDate);
      queryEndDate.setHours(23, 59, 59, 999);
    } else {
      // Default to today
      const today = new Date();
      queryStartDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      queryEndDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    }

    // Get all drivers using raw SQL to avoid email field error
    const driversQuery = driverId 
      ? `SELECT id, driverId, name, phone, age, gender, profilePhoto FROM drivers WHERE id = ?`
      : `SELECT id, driverId, name, phone, age, gender, profilePhoto FROM drivers`;
    
    const allDrivers = driverId 
      ? await prisma.$queryRawUnsafe(driversQuery, driverId)
      : await prisma.$queryRawUnsafe(driversQuery);

    // Get monitoring sessions for each day in the date range
    const attendanceRecords = [];
    
    // Generate dates between start and end
    const currentDate = new Date(queryStartDate);
    while (currentDate <= queryEndDate) {
      const dayStart = new Date(currentDate);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      // For each driver, check if they have any monitoring session on this day
      for (const driver of allDrivers) {
        // Find the first monitoring session for this driver on this day using raw SQL
        const firstSessionResult = await prisma.$queryRaw<Array<{
          id: string;
          sessionId: string;
          driverId: string;
          startTime: Date;
          endTime: Date | null;
          status: string;
        }>>`
          SELECT id, sessionId, driverId, startTime, endTime, status 
          FROM monitoring_sessions 
          WHERE driverId = ${driver.id} 
            AND DATE(startTime) = DATE(${dayStart})
          ORDER BY startTime ASC 
          LIMIT 1
        `;

        // Find the last completed session to determine check-out time
        const lastSessionResult = await prisma.$queryRaw<Array<{
          id: string;
          sessionId: string;
          driverId: string;
          startTime: Date;
          endTime: Date | null;
          status: string;
        }>>`
          SELECT id, sessionId, driverId, startTime, endTime, status 
          FROM monitoring_sessions 
          WHERE driverId = ${driver.id} 
            AND DATE(startTime) = DATE(${dayStart})
            AND status = 'COMPLETED'
            AND endTime IS NOT NULL
          ORDER BY endTime DESC 
          LIMIT 1
        `;

        const firstSession = firstSessionResult[0] || null;
        const lastSession = lastSessionResult[0] || null;

        // Determine status and times - simplified to just PRESENT/ABSENT
        let attendanceStatus = 'ABSENT';
        let checkInTime = null;
        let checkOutTime = null;
        let workingHours = null;
        let location = null;

        if (firstSession) {
          attendanceStatus = 'PRESENT';
          checkInTime = new Date(firstSession.startTime);
          location = 'Monitoring System';

          // If there's a completed session, set check-out time
          if (lastSession && lastSession.endTime) {
            checkOutTime = new Date(lastSession.endTime);
            
            // Calculate working hours
            const checkInMs = new Date(firstSession.startTime).getTime();
            const checkOutMs = new Date(lastSession.endTime).getTime();
            workingHours = (checkOutMs - checkInMs) / (1000 * 60 * 60); // Convert to hours
          }
        }

        // Create attendance record object
        const attendanceRecord = {
          id: `${driver.id}-${currentDate.toISOString().split('T')[0]}`,
          driverId: driver.id,
          date: new Date(currentDate),
          checkInTime,
          checkOutTime,
          workingHours,
          status: attendanceStatus,
          location,
          notes: firstSession ? `Session ID: ${firstSession.sessionId}` : null,
          createdAt: firstSession ? new Date(firstSession.startTime) : new Date(),
          updatedAt: lastSession ? new Date(lastSession.endTime!) : (firstSession ? new Date(firstSession.startTime) : new Date()),
          driver,
        };

        attendanceRecords.push(attendanceRecord);
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Apply status filter if provided
    let filteredRecords = attendanceRecords;
    if (status) {
      filteredRecords = attendanceRecords.filter(record => record.status === status);
    }

    // Sort by date (most recent first)
    filteredRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Apply pagination
    const total = filteredRecords.length;
    const paginatedRecords = filteredRecords.slice(skip, skip + limit);

    const response: PaginatedResponse<any> = {
      data: paginatedRecords,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    return NextResponse.json({
      success: true,
      ...response,
    });
  } catch (error) {
    console.error('Error fetching attendance records:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch attendance records',
      },
      { status: 500 }
    );
  }
}

// POST /api/attendance - Create a new attendance record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      driverId,
      date,
      checkInTime,
      checkOutTime,
      status,
      location,
      notes,
    } = body;

    // Validate required fields
    if (!driverId || !date) {
      return NextResponse.json(
        {
          success: false,
          error: 'Driver ID and date are required',
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

    // Calculate working hours if both check-in and check-out times are provided
    let workingHours: number | null = null;
    if (checkInTime && checkOutTime) {
      const checkIn = new Date(checkInTime);
      const checkOut = new Date(checkOutTime);
      workingHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
    }

    // Create attendance record
    const attendanceRecord = await prisma.attendanceRecord.create({
      data: {
        driverId,
        date: new Date(date),
        checkInTime: checkInTime ? new Date(checkInTime) : null,
        checkOutTime: checkOutTime ? new Date(checkOutTime) : null,
        workingHours,
        status: status || 'PRESENT',
        location: location || null,
        notes: notes || null,
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
      message: 'Attendance record created successfully',
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating attendance record:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create attendance record',
      },
      { status: 500 }
    );
  }
}
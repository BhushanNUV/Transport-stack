import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/attendance/monitoring-sessions - Get attendance based on monitoring sessions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get('driverId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const date = searchParams.get('date'); // For specific date
    
    // Build date filter
    let dateFilter = '';
    const params: any[] = [];
    
    if (date) {
      // For specific date, check records for that day
      dateFilter = 'AND DATE(ms.createdAt) = DATE(?)';
      params.push(date);
    } else if (startDate && endDate) {
      // For date range
      dateFilter = 'AND DATE(ms.createdAt) BETWEEN DATE(?) AND DATE(?)';
      params.push(startDate, endDate);
    } else {
      // Default to last 30 days
      dateFilter = 'AND ms.createdAt >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
    }
    
    // Build driver filter
    let driverFilter = '';
    if (driverId) {
      driverFilter = 'AND ms.driverId = ?';
      params.push(driverId);
    }

    // Query to get attendance based on monitoring sessions
    const attendanceQuery = `
      SELECT 
        DATE(ms.createdAt) as attendance_date,
        ms.driverId,
        d.name as driver_name,
        d.driverId as driver_code,
        MIN(ms.createdAt) as first_session,
        MAX(ms.createdAt) as last_session,
        COUNT(*) as total_sessions,
        CASE 
          WHEN ms.driverId IS NOT NULL THEN 'PRESENT'
          ELSE 'ABSENT'
        END as status
      FROM monitoring_sessions ms
      LEFT JOIN drivers d ON ms.driverId = d.id
      WHERE ms.driverId IS NOT NULL
      ${dateFilter}
      ${driverFilter}
      GROUP BY DATE(ms.createdAt), ms.driverId
      ORDER BY attendance_date DESC, d.name ASC
    `;

    const attendance = await prisma.$queryRaw<any[]>`${attendanceQuery}`;

    // Process attendance data
    const processedAttendance = attendance.map((record: any) => ({
      date: record.attendance_date,
      driverId: record.driverId,
      driverName: record.driver_name,
      driverCode: record.driver_code,
      status: record.status,
      checkInTime: record.first_session, // First monitoring session of the day
      checkOutTime: record.last_session, // Last monitoring session of the day
      totalSessions: Number(record.total_sessions),
      workingHours: record.first_session && record.last_session 
        ? ((new Date(record.last_session).getTime() - new Date(record.first_session).getTime()) / (1000 * 60 * 60)).toFixed(2)
        : null
    }));

    // If querying for all drivers on a specific date, also include absent drivers
    if (date && !driverId) {
      // Get all drivers
      const allDrivers = await prisma.driver.findMany({
        select: { id: true, name: true, driverId: true }
      });

      // Find drivers with no monitoring sessions on the specified date
      const presentDriverIds = processedAttendance.map(a => a.driverId);
      const absentDrivers = allDrivers
        .filter(driver => !presentDriverIds.includes(driver.id))
        .map(driver => ({
          date: new Date(date),
          driverId: driver.id,
          driverName: driver.name,
          driverCode: driver.driverId,
          status: 'ABSENT',
          checkInTime: null,
          checkOutTime: null,
          totalSessions: 0,
          workingHours: null
        }));

      processedAttendance.push(...absentDrivers);
    }

    return NextResponse.json({
      success: true,
      data: processedAttendance,
      total: processedAttendance.length
    });

  } catch (error) {
    console.error('Error fetching attendance from monitoring sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attendance data' },
      { status: 500 }
    );
  }
}

// POST /api/attendance/monitoring-sessions - Get attendance summary
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { driverIds, startDate, endDate } = body;

    // Build query for attendance summary
    let driverFilter = '';
    const params: any[] = [];
    
    if (driverIds && driverIds.length > 0) {
      driverFilter = `AND ms.driverId IN (${driverIds.map(() => '?').join(',')})`;
      params.push(...driverIds);
    }

    let dateFilter = '';
    if (startDate && endDate) {
      dateFilter = 'AND DATE(ms.createdAt) BETWEEN DATE(?) AND DATE(?)';
      params.push(startDate, endDate);
    }

    const summaryQuery = `
      SELECT 
        ms.driverId,
        d.name as driver_name,
        d.driverId as driver_code,
        COUNT(DISTINCT DATE(ms.createdAt)) as days_present,
        COUNT(*) as total_sessions,
        MIN(DATE(ms.createdAt)) as first_attendance,
        MAX(DATE(ms.createdAt)) as last_attendance
      FROM monitoring_sessions ms
      LEFT JOIN drivers d ON ms.driverId = d.id
      WHERE ms.driverId IS NOT NULL
      ${dateFilter}
      ${driverFilter}
      GROUP BY ms.driverId
      ORDER BY d.name ASC
    `;

    const summary = await prisma.$queryRaw<any[]>`${summaryQuery}`;

    return NextResponse.json({
      success: true,
      data: summary,
      total: summary.length
    });

  } catch (error) {
    console.error('Error fetching attendance summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attendance summary' },
      { status: 500 }
    );
  }
}
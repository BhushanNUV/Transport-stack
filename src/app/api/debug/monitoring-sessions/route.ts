import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Get all monitoring sessions
    const allSessions = await prisma.$queryRaw<any[]>`
      SELECT driverId, sessionId, startTime, alcohol_detected, smoking_detected, drowsy_detected, mobile_use_detected, eating_detected, drinking_detected
      FROM monitoring_sessions
      ORDER BY startTime DESC
      LIMIT 10
    `;
    
    // Get unique driver IDs
    const uniqueDrivers = await prisma.$queryRaw<any[]>`
      SELECT DISTINCT driverId
      FROM monitoring_sessions
      ORDER BY driverId
    `;
    
    return NextResponse.json({
      success: true,
      data: {
        totalSessions: allSessions.length,
        uniqueDrivers: uniqueDrivers.length,
        sessions: allSessions,
        drivers: uniqueDrivers
      }
    });
  } catch (error) {
    console.error('Error fetching monitoring sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch monitoring sessions' },
      { status: 500 }
    );
  }
}
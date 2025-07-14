import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get('driverId');
    
    if (!driverId) {
      return NextResponse.json({ error: 'Driver ID required' }, { status: 400 });
    }
    
    // Get latest monitoring session for this driver
    const latestSession = await prisma.$queryRaw<any[]>`
      SELECT *
      FROM monitoring_sessions
      WHERE driverId = ${driverId}
      ORDER BY startTime DESC
      LIMIT 1
    `;
    
    return NextResponse.json({
      success: true,
      data: {
        driverId,
        latestSession: latestSession[0] || null,
        sessionCount: latestSession.length
      }
    });
  } catch (error) {
    console.error('Error fetching driver sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch driver sessions' },
      { status: 500 }
    );
  }
}
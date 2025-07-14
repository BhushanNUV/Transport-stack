import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get('driverId');
    
    if (!driverId) {
      return NextResponse.json({ error: 'Driver ID required' }, { status: 400 });
    }
    
    // Get latest monitoring session WITH detections for this driver
    const latestSessionWithDetections = await prisma.$queryRaw<any[]>`
      SELECT *
      FROM monitoring_sessions
      WHERE driverId = ${driverId}
        AND (
          alcohol_detected = 1 OR 
          smoking_detected = 1 OR 
          drowsy_detected = 1 OR 
          sleeping_detected = 1 OR 
          mobile_use_detected = 1 OR 
          eating_detected = 1 OR 
          drinking_detected = 1
        )
      ORDER BY startTime DESC
      LIMIT 1
    `;
    
    return NextResponse.json({
      success: true,
      data: {
        driverId,
        latestSessionWithDetections: latestSessionWithDetections[0] || null,
        sessionCount: latestSessionWithDetections.length
      }
    });
  } catch (error) {
    console.error('Error fetching driver sessions with detections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch driver sessions with detections' },
      { status: 500 }
    );
  }
}
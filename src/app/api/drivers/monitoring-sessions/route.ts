import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Base URL for detection images from environment variable
const DETECTION_IMAGE_BASE_URL = process.env.FLASK_API_BASE_URL || 'http://localhost:5000';

// Helper function to process monitoring session data
function processMonitoringSession(session: any) {
  const processedSession = { ...session };
  
  // Process detection image URLs
  const detectionTypes = [
    { field: 'alcohol_detected', imgField: 'alcohol_img' },
    { field: 'smoking_detected', imgField: 'smoking_img' },
    { field: 'drowsy_detected', imgField: 'drowsy_img' },
    { field: 'sleeping_detected', imgField: 'sleeping_img' },
    { field: 'mobile_use_detected', imgField: 'mobile_use_img' },
    { field: 'eating_detected', imgField: 'eating_img' },
    { field: 'drinking_detected', imgField: 'drinking_img' }
  ];

  detectionTypes.forEach(({ field, imgField }) => {
    // If detected (1) and has image path, construct full URL
    if (processedSession[field] === 1 && processedSession[imgField]) {
      processedSession[`${imgField}_url`] = `${DETECTION_IMAGE_BASE_URL}/${processedSession[imgField]}`;
    } else {
      processedSession[`${imgField}_url`] = null;
    }
  });

  return processedSession;
}

// GET /api/drivers/monitoring-sessions - Get monitoring sessions for all drivers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get('driverId');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    const whereClause: any = {};
    if (driverId) {
      whereClause.driverId = driverId;
    }

    // Query monitoring_sessions directly with raw SQL since Prisma schema doesn't have these columns
    const sessions = await prisma.$queryRaw`
      SELECT 
        ms.*,
        d.name as driver_name,
        d.driverId as driver_code
      FROM monitoring_sessions ms
      LEFT JOIN drivers d ON ms.driverId = d.id
      WHERE 1=1
      ${driverId ? prisma.$queryRaw`AND ms.driverId = ${driverId}` : prisma.$queryRaw``}
      ORDER BY ms.createdAt DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    // Process sessions to add image URLs
    const processedSessions = (sessions as any[]).map(session => processMonitoringSession(session));

    // Get total count
    const totalCount = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count 
      FROM monitoring_sessions
      WHERE 1=1
      ${driverId ? prisma.$queryRaw`AND driverId = ${driverId}` : prisma.$queryRaw``}
    `;

    const total = Number(totalCount[0].count);

    return NextResponse.json({
      success: true,
      data: processedSessions,
      pagination: {
        total,
        limit,
        offset,
        totalPages: Math.ceil(total / limit)
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
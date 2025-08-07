import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/health-reports/check-dates - Check what dates are in the database
export async function GET(request: NextRequest) {
  try {
    // Get all unique report dates
    const allReports = await prisma.healthReport.findMany({
      select: {
        reportDate: true,
        createdAt: true,
      },
      orderBy: { reportDate: 'desc' },
      take: 10,
    });
    
    // Count by different date comparisons
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    
    // Try counting with different date fields
    const countByReportDate = await prisma.healthReport.count({
      where: {
        reportDate: {
          gte: todayStart,
          lt: todayEnd,
        },
      },
    });
    
    const countByCreatedAt = await prisma.healthReport.count({
      where: {
        createdAt: {
          gte: todayStart,
          lt: todayEnd,
        },
      },
    });
    
    // Get total count
    const totalCount = await prisma.healthReport.count();
    
    return NextResponse.json({
      currentDate: now.toISOString(),
      todayStart: todayStart.toISOString(),
      todayEnd: todayEnd.toISOString(),
      totalReports: totalCount,
      countByReportDate,
      countByCreatedAt,
      sampleReports: allReports.map(r => ({
        reportDate: r.reportDate.toISOString(),
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to check dates',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
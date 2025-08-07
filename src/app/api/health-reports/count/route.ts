import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/health-reports/count - Get simple count of health reports
export async function GET(request: NextRequest) {
  try {
    // Get total count of ALL health reports
    const totalCount = await prisma.healthReport.count();
    
    // Get first 3 reports to see their dates
    const sampleReports = await prisma.healthReport.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        reportDate: true,
        driver: {
          select: {
            name: true,
          }
        }
      }
    });
    
    // Try different date comparisons for today
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Count with createdAt
    const todayCountCreatedAt = await prisma.healthReport.count({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });
    
    // Count with reportDate  
    const todayCountReportDate = await prisma.healthReport.count({
      where: {
        reportDate: {
          gte: today,
          lt: tomorrow,
        },
      },
    });
    
    // Get all reports and manually filter for today
    const allReports = await prisma.healthReport.findMany({
      select: {
        createdAt: true,
        reportDate: true,
      }
    });
    
    const manualTodayCount = allReports.filter(report => {
      const reportDate = new Date(report.reportDate);
      return reportDate >= today && reportDate < tomorrow;
    }).length;

    return NextResponse.json({
      success: true,
      data: {
        totalCount,
        todayCountCreatedAt,
        todayCountReportDate,
        manualTodayCount,
        todayDate: today.toISOString(),
        tomorrowDate: tomorrow.toISOString(),
        sampleReports,
        currentTime: now.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error counting reports:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to count reports',
      },
      { status: 500 }
    );
  }
}
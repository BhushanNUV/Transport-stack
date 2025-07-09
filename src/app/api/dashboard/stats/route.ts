import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // Get total drivers count
    const totalDrivers = await prisma.driver.count();

    // Get active drivers today (drivers who checked in today)
    const activeToday = await prisma.attendanceRecord.count({
      where: {
        date: {
          gte: startOfDay,
          lt: endOfDay,
        },
        checkInTime: {
          not: null,
        },
      },
    });

    // Get health alerts count (recent health reports with high risk levels)
    const healthAlerts = await prisma.healthReport.count({
      where: {
        reportDate: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
        riskLevel: {
          in: ['HIGH', 'CRITICAL'],
        },
      },
    });

    // Calculate attendance rate for today
    const totalScheduledDrivers = totalDrivers; // Assuming all drivers are scheduled
    const attendanceRate = totalScheduledDrivers > 0 
      ? Math.round((activeToday / totalScheduledDrivers) * 100 * 100) / 100 
      : 0;

    // Calculate average health score from recent reports
    const recentHealthReports = await prisma.healthReport.findMany({
      where: {
        reportDate: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
        heartRate: {
          not: null,
        },
      },
      select: {
        heartRate: true,
        bloodPressureHigh: true,
        bloodPressureLow: true,
        stressLevel: true,
        riskLevel: true,
      },
    });

    // Calculate health score based on various factors
    let totalHealthScore = 0;
    let validReports = 0;

    recentHealthReports.forEach(report => {
      let score = 100; // Start with perfect score

      // Deduct points based on heart rate
      if (report.heartRate) {
        if (report.heartRate < 60 || report.heartRate > 100) {
          score -= 15;
        }
      }

      // Deduct points based on blood pressure
      if (report.bloodPressureHigh && report.bloodPressureLow) {
        if (report.bloodPressureHigh > 140 || report.bloodPressureLow > 90) {
          score -= 20;
        }
      }

      // Deduct points based on stress level
      if (report.stressLevel) {
        switch (report.stressLevel) {
          case 'HIGH':
            score -= 15;
            break;
          case 'VERY_HIGH':
            score -= 25;
            break;
          case 'MILD':
            score -= 5;
            break;
        }
      }

      // Deduct points based on risk level
      switch (report.riskLevel) {
        case 'HIGH':
          score -= 20;
          break;
        case 'CRITICAL':
          score -= 40;
          break;
        case 'MEDIUM':
          score -= 10;
          break;
      }

      totalHealthScore += Math.max(score, 0); // Ensure score doesn't go below 0
      validReports++;
    });

    const avgHealthScore = validReports > 0 
      ? Math.round((totalHealthScore / validReports) * 100) / 100
      : 75; // Default score if no reports

    // Get critical cases count (drivers with critical health alerts or recent high-risk detections)
    const criticalHealthCases = await prisma.healthReport.count({
      where: {
        reportDate: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
        riskLevel: 'CRITICAL',
      },
    });

    const criticalDetectionCases = await prisma.systemAlert.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
        severity: 'CRITICAL',
        type: {
          in: ['HEALTH', 'ALCOHOL_DETECTION', 'SAFETY'],
        },
      },
    });

    const criticalCases = criticalHealthCases + criticalDetectionCases;

    // Get recent activity
    const recentActivity = await prisma.$transaction(async (tx) => {
      // Get recent check-ins
      const recentCheckIns = await tx.attendanceRecord.findMany({
        where: {
          checkInTime: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
        include: {
          driver: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          checkInTime: 'desc',
        },
        take: 3,
      });

      // Get recent health alerts
      const recentHealthAlerts = await tx.healthReport.findMany({
        where: {
          reportDate: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
          riskLevel: {
            in: ['HIGH', 'CRITICAL'],
          },
        },
        include: {
          driver: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          reportDate: 'desc',
        },
        take: 2,
      });

      // Get recent system alerts
      const recentSystemAlerts = await tx.systemAlert.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
          type: {
            in: ['SAFETY', 'ALCOHOL_DETECTION'],
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 2,
      });

      return { recentCheckIns, recentHealthAlerts, recentSystemAlerts };
    });

    // Format recent activity
    const formattedActivity = [];

    // Add check-ins
    recentActivity.recentCheckIns.forEach(record => {
      formattedActivity.push({
        id: `checkin-${record.id}`,
        type: 'check-in',
        message: 'Checked in for shift',
        time: getTimeAgo(record.checkInTime!),
        driverName: record.driver.name,
      });
    });

    // Add health alerts
    recentActivity.recentHealthAlerts.forEach(report => {
      formattedActivity.push({
        id: `health-${report.id}`,
        type: 'health-alert',
        message: `${report.riskLevel.toLowerCase()} risk level detected`,
        time: getTimeAgo(report.reportDate),
        driverName: report.driver.name,
      });
    });

    // Add system alerts
    recentActivity.recentSystemAlerts.forEach(alert => {
      formattedActivity.push({
        id: `alert-${alert.id}`,
        type: alert.type.toLowerCase() === 'alcohol_detection' ? 'safety' : 'safety',
        message: alert.message,
        time: getTimeAgo(alert.createdAt),
        driverName: 'System',
      });
    });

    // Sort by most recent and take top 4
    formattedActivity.sort((a, b) => {
      const timeA = parseTimeAgo(a.time);
      const timeB = parseTimeAgo(b.time);
      return timeA - timeB;
    });

    const stats = {
      totalDrivers,
      activeToday,
      healthAlerts,
      attendanceRate,
      avgHealthScore,
      criticalCases,
    };

    return NextResponse.json({
      stats,
      recentActivity: formattedActivity.slice(0, 4),
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}

// Helper function to get time ago string
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 60) {
    return `${diffInMinutes} minutes ago`;
  } else if (diffInMinutes < 1440) { // Less than 24 hours
    const hours = Math.floor(diffInMinutes / 60);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffInMinutes / 1440);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
}

// Helper function to parse time ago for sorting
function parseTimeAgo(timeStr: string): number {
  const match = timeStr.match(/(\d+)\s+(minute|hour|day)/);
  if (!match) return 0;
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case 'minute':
      return value;
    case 'hour':
      return value * 60;
    case 'day':
      return value * 1440;
    default:
      return 0;
  }
}
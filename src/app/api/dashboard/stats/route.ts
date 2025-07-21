import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

    // Get total drivers count
    const totalDrivers = await prisma.driver.count();

    // Get drivers count from last month for comparison
    const driversLastMonth = await prisma.driver.count({
      where: {
        createdAt: {
          gte: startOfLastMonth,
          lte: endOfLastMonth,
        },
      },
    });

    // Get present drivers today (drivers who have monitoring sessions today - same logic as attendance API)
    const presentTodayResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT driverId) as count
      FROM monitoring_sessions 
      WHERE DATE(startTime) = DATE(NOW())
        AND driverId IS NOT NULL
    `;
    const activeToday = Number(presentTodayResult[0]?.count || 0);

    // Get present drivers yesterday for comparison
    const presentYesterdayResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT driverId) as count
      FROM monitoring_sessions 
      WHERE DATE(startTime) = DATE(${yesterday})
        AND driverId IS NOT NULL
    `;
    const activeYesterday = Number(presentYesterdayResult[0]?.count || 0);

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

    // Get health alerts from previous week for comparison
    const healthAlertsLastWeek = await prisma.healthReport.count({
      where: {
        reportDate: {
          gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
          lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
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

    // Calculate attendance rate for last week for comparison
    const lastWeekStart = new Date(today);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(today);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);

    const presentLastWeekResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT driverId) as count
      FROM monitoring_sessions 
      WHERE DATE(startTime) >= DATE(${lastWeekStart})
        AND DATE(startTime) <= DATE(${lastWeekEnd})
        AND driverId IS NOT NULL
    `;
    const activeLastWeek = Number(presentLastWeekResult[0]?.count || 0);
    const attendanceRateLastWeek = totalScheduledDrivers > 0 
      ? Math.round((activeLastWeek / (totalScheduledDrivers * 7)) * 100 * 100) / 100 
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
    const formattedActivity: Array<{
      id: string;
      type: string;
      message: string;
      time: string;
      driverName: string;
    }> = [];

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

    // Calculate changes
    const driversChangeThisMonth = totalDrivers - driversLastMonth;
    const presentChangeFromYesterday = activeToday - activeYesterday;
    const healthAlertsChange = healthAlerts - healthAlertsLastWeek;
    const attendanceRateChange = attendanceRate - attendanceRateLastWeek;

    const stats = {
      totalDrivers,
      activeToday,
      healthAlerts,
      attendanceRate,
      avgHealthScore,
      criticalCases,
      changes: {
        driversThisMonth: driversChangeThisMonth,
        presentFromYesterday: presentChangeFromYesterday,
        healthAlertsFromLastWeek: healthAlertsChange,
        attendanceRateFromLastWeek: attendanceRateChange,
      },
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
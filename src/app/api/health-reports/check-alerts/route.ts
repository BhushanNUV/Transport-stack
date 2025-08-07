import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAndCreateAlerts } from '@/lib/alertService';

// POST /api/health-reports/check-alerts - Check existing health reports and create alerts
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const checkAll = searchParams.get('all') === 'true';
    const driverId = searchParams.get('driverId');
    
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Build query conditions
    const whereConditions: any = {
      reportDate: {
        gte: today,
        lt: tomorrow,
      },
    };

    if (!checkAll && driverId) {
      whereConditions.driverId = driverId;
    }

    // Get health reports with driver info
    const healthReports = await prisma.healthReport.findMany({
      where: whereConditions,
      include: {
        driver: true,
      },
    });

    let alertsCreated = 0;
    const processedDrivers: string[] = [];

    for (const report of healthReports) {
      if (!report.driver.organizationId) continue;

      // Check both old and new fields
      const metrics: any = {};

      // Parse heart rate from new field or use old field
      if (report.heart_rate) {
        const hrValue = parseFloat(report.heart_rate.split(' ')[0]);
        if (!isNaN(hrValue)) {
          metrics.heartRate = hrValue;
        }
      } else if (report.heartRate) {
        metrics.heartRate = report.heartRate;
      }

      // Parse breathing rate
      if (report.breathing_rate) {
        const brValue = parseFloat(report.breathing_rate.split(' ')[0]);
        if (!isNaN(brValue)) {
          metrics.breathingRate = brValue;
        }
      }

      // Parse oxygen saturation
      if (report.oxygen_saturation) {
        const osValue = parseFloat(report.oxygen_saturation.replace('%', ''));
        if (!isNaN(osValue)) {
          metrics.oxygenSaturation = osValue;
        }
      }

      // Parse HRV SDNN
      if (report.hrv_sdnn) {
        const hrvValue = parseFloat(report.hrv_sdnn.split(' ')[0]);
        if (!isNaN(hrvValue)) {
          metrics.hrvSDNN = hrvValue;
        }
      }

      // Parse Mean RRI
      if (report.mean_rri) {
        const rriValue = parseFloat(report.mean_rri.split(' ')[0]);
        if (!isNaN(rriValue)) {
          metrics.meanRRI = rriValue;
        }
      }

      // Parse Parasympathetic NS
      if (report.parasympathetic_ns) {
        const pnsValue = parseFloat(report.parasympathetic_ns.split(' ')[0]);
        if (!isNaN(pnsValue)) {
          metrics.parasympathetic = pnsValue;
        }
      }

      // Parse SNS Index
      if (report.sns_index) {
        const snsValue = parseFloat(report.sns_index);
        if (!isNaN(snsValue)) {
          metrics.snsIndex = snsValue;
        }
      }

      // Map stress level to SNS index if SNS index not available
      if (!metrics.snsIndex && report.stress_level) {
        const stressMap: Record<string, number> = {
          'VERY_HIGH': 8,
          'HIGH': 6,
          'MILD': 4,
          'LOW': 2,
          'NORMAL': 1,
        };
        metrics.snsIndex = stressMap[report.stress_level] || undefined;
      }

      // Check if we have any metrics to check
      if (Object.keys(metrics).length > 0) {
        await checkAndCreateAlerts(
          report.driverId,
          report.driver.name,
          metrics,
          report.driver.organizationId
        );
        alertsCreated++;
        processedDrivers.push(report.driver.name);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${healthReports.length} health reports`,
      data: {
        reportsChecked: healthReports.length,
        driversProcessed: processedDrivers.length,
        drivers: processedDrivers,
        alertsGenerated: alertsCreated > 0,
      },
    });
  } catch (error) {
    console.error('Error checking health reports for alerts:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check health reports for alerts',
      },
      { status: 500 }
    );
  }
}

// GET /api/health-reports/check-alerts - Get current alert status
export async function GET(request: NextRequest) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get count of reports needing alert checks
    const reportsToday = await prisma.healthReport.count({
      where: {
        reportDate: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    // Get reports with potential issues
    const reportsWithIssues = await prisma.healthReport.findMany({
      where: {
        reportDate: {
          gte: today,
          lt: tomorrow,
        },
        OR: [
          // Heart rate outside 60-100
          { heart_rate: { contains: '5' } }, // Will catch 50s
          { heart_rate: { contains: '4' } }, // Will catch 40s
          { heart_rate: { contains: '10' } }, // Will catch 100+
          { heart_rate: { contains: '11' } }, // Will catch 110+
          // Breathing rate outside 12-20
          { breathing_rate: { contains: '2' } }, // Will catch 20+
          { breathing_rate: { contains: '3' } }, // Will catch 30+
          { breathing_rate: { contains: '11' } }, // Will catch 11 or less
          // Oxygen below 90
          { oxygen_saturation: { contains: '8' } }, // Will catch 80s
          { oxygen_saturation: { contains: '7' } }, // Will catch 70s
        ],
      },
      include: {
        driver: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        totalReportsToday: reportsToday,
        reportsNeedingAlerts: reportsWithIssues.length,
        drivers: reportsWithIssues.map(r => ({
          name: r.driver.name,
          heartRate: r.heart_rate,
          breathingRate: r.breathing_rate,
          oxygenSaturation: r.oxygen_saturation,
        })),
      },
    });
  } catch (error) {
    console.error('Error getting alert status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get alert status',
      },
      { status: 500 }
    );
  }
}
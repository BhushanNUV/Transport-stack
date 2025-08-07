import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/health-reports/today-stats - Get today's health report statistics
export async function GET(request: NextRequest) {
  try {
    // Get current date for today
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayDateStr = `${year}-${month}-${day}`;
    
    // Count ALL health reports (total)
    const overallTotalReports = await prisma.healthReport.count();
    
    // Count today's reports using DATE function in SQL for accurate comparison
    const todayCountResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count 
      FROM health_reports 
      WHERE DATE(reportDate) = DATE(${todayDateStr})
    `;
    const todayReportsCount = Number(todayCountResult[0]?.count || 0);
    
    // Get today's reports for critical case analysis
    const todayReportsResult = await prisma.$queryRaw<Array<any>>`
      SELECT id, heart_rate, breathing_rate, oxygen_saturation, heartRate, riskLevel
      FROM health_reports 
      WHERE DATE(reportDate) = DATE(${todayDateStr})
    `;
    
    // Manually count critical cases for today
    let criticalCasesCount = 0;
    todayReportsResult.forEach(report => {
      let isCritical = false;
      
      // Check heart rate (string format like "49 BPM")
      if (report.heart_rate) {
        const hrMatch = report.heart_rate.match(/(\d+)/);
        if (hrMatch) {
          const hrValue = parseInt(hrMatch[1]);
          if (hrValue < 60 || hrValue > 100) isCritical = true;
        }
      }
      
      // Check heart rate (numeric format)
      if (report.heartRate && (report.heartRate < 60 || report.heartRate > 100)) {
        isCritical = true;
      }
      
      // Check breathing rate (string format like "25 breaths/min")
      if (report.breathing_rate) {
        const brMatch = report.breathing_rate.match(/(\d+)/);
        if (brMatch) {
          const brValue = parseInt(brMatch[1]);
          if (brValue < 12 || brValue > 20) isCritical = true;
        }
      }
      
      // Check oxygen saturation (string format like "88 %")
      if (report.oxygen_saturation) {
        const osMatch = report.oxygen_saturation.match(/(\d+)/);
        if (osMatch) {
          const osValue = parseInt(osMatch[1]);
          if (osValue < 90) isCritical = true;
        }
      }
      
      // Check risk level
      if (report.riskLevel === 'CRITICAL' || report.riskLevel === 'HIGH') {
        isCritical = true;
      }
      
      if (isCritical) criticalCasesCount++;
    });

    // Get all reports to count overall critical cases
    const allReportsResult = await prisma.$queryRaw<Array<any>>`
      SELECT heart_rate, breathing_rate, oxygen_saturation, heartRate, riskLevel
      FROM health_reports
    `;

    // Count overall critical cases
    let overallCriticalCount = 0;
    allReportsResult.forEach(report => {
      let isCritical = false;
      
      // Check heart rate (string format)
      if (report.heart_rate) {
        const hrMatch = report.heart_rate.match(/(\d+)/);
        if (hrMatch) {
          const hrValue = parseInt(hrMatch[1]);
          if (hrValue < 60 || hrValue > 100) isCritical = true;
        }
      }
      
      // Check heart rate (numeric format)
      if (report.heartRate && (report.heartRate < 60 || report.heartRate > 100)) {
        isCritical = true;
      }
      
      // Check breathing rate
      if (report.breathing_rate) {
        const brMatch = report.breathing_rate.match(/(\d+)/);
        if (brMatch) {
          const brValue = parseInt(brMatch[1]);
          if (brValue < 12 || brValue > 20) isCritical = true;
        }
      }
      
      // Check oxygen saturation
      if (report.oxygen_saturation) {
        const osMatch = report.oxygen_saturation.match(/(\d+)/);
        if (osMatch) {
          const osValue = parseInt(osMatch[1]);
          if (osValue < 90) isCritical = true;
        }
      }
      
      // Check risk level
      if (report.riskLevel === 'CRITICAL' || report.riskLevel === 'HIGH') {
        isCritical = true;
      }
      
      if (isCritical) overallCriticalCount++;
    });

    return NextResponse.json({
      success: true,
      data: {
        date: todayDateStr,
        todayReports: todayReportsCount,
        criticalCases: criticalCasesCount,
        criticalCasesOverall: overallCriticalCount,
        overallTotalReports: overallTotalReports,
        uniqueDrivers: 0,
        highRiskCases: 0,
      },
    });
  } catch (error) {
    console.error('Error fetching today stats:', error);
    return NextResponse.json({
      success: true,
      data: {
        date: new Date().toISOString(),
        todayReports: 0,
        criticalCases: 0,
        criticalCasesOverall: 0,
        overallTotalReports: 0,
        uniqueDrivers: 0,
        highRiskCases: 0,
      },
    });
  }
}
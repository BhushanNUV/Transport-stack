import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST - Save health vitals data for a specific driver
export async function POST(request: NextRequest) {
  try {
    const healthData = await request.json();
    const { driverId, ...otherHealthData } = healthData;
    
    if (!driverId) {
      return NextResponse.json(
        { error: 'Driver ID is required in request body' },
        { status: 400 }
      );
    }
    
    // Validate that at least one health metric is provided
    const healthMetrics = [
      'weight', 'height', 'age', 'address', 'phone',
      'heart_age', 'ascvd_risk', 'low_hemoglobin_risk', 'high_total_cholesterol_risk',
      'high_fasting_glucose_risk', 'heart_rate', 'breathing_rate', 'prq',
      'oxygen_saturation', 'blood_pressure', 'stress_level', 'recovery_ability',
      'stress_response', 'respiration', 'hrv_sdnn', 'hemoglobin', 'hba1c',
      'heart_rate_conf_level', 'breathing_rate_conf_level', 'prq_conf_level',
      'hrv_sdnn_conf_level', 'license_key', 'hypertension_risk', 'diabetic_risk'
    ];
    
    const providedMetrics = Object.keys(otherHealthData).filter(key => 
      healthMetrics.includes(key) && otherHealthData[key] !== null && otherHealthData[key] !== undefined
    );
    
    if (providedMetrics.length === 0) {
      return NextResponse.json(
        { error: 'At least one health metric must be provided' },
        { status: 400 }
      );
    }

    // Filter only valid health metrics from the request
    const validHealthData = Object.fromEntries(
      Object.entries(otherHealthData).filter(([key]) => healthMetrics.includes(key))
    );

    const driver = await prisma.driver.update({
      where: { id: driverId },
      data: validHealthData
    });

    return NextResponse.json({
      success: true,
      message: 'Health vitals data saved successfully',
      data: driver,
      updatedFields: providedMetrics
    });
  } catch (error) {
    console.error('Error saving health vitals:', error);
    return NextResponse.json(
      { error: 'Failed to save health vitals data' },
      { status: 500 }
    );
  }
}

// GET - Retrieve health vitals data for a specific driver
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Driver ID is required' },
        { status: 400 }
      );
    }
    
    // Check if driver exists
    const driver = await prisma.driver.findUnique({
      where: { id },
      select: { id: true, name: true, driverId: true }
    });

    if (!driver) {
      return NextResponse.json(
        { error: 'Driver not found' },
        { status: 404 }
      );
    }

    // Get health reports for this driver
    const healthReports = await prisma.healthReport.findMany({
      where: { driverId: id },
      orderBy: { reportDate: 'desc' },
      take: 20
    });

    // Get monitoring sessions for this driver with health data
    const monitoringSessions = await prisma.$queryRaw<any[]>`
      SELECT 
        ms.id as session_id,
        ms.sessionId,
        ms.driverId,
        ms.startTime,
        ms.endTime,
        ms.status,
        d.name as driver_name,
        d.driverId as driver_id,
        hr.id as health_report_id,
        hr.reportDate,
        hr.bloodPressureHigh,
        hr.bloodPressureLow,
        hr.heartRate,
        hr.stressLevel,
        hr.riskLevel,
        hr.notes as health_notes
      FROM monitoring_sessions ms
      INNER JOIN drivers d ON ms.driverId = d.id
      LEFT JOIN health_reports hr ON ms.driverId = hr.driverId 
        AND DATE(ms.startTime) = DATE(hr.reportDate)
      WHERE ms.driverId = ${id}
        AND ms.driverId IS NOT NULL
      ORDER BY ms.startTime DESC
      LIMIT 50
    `;

    // Combine and format the data
    const response = {
      success: true,
      data: {
        driver: {
          id: driver.id,
          name: driver.name,
          driverId: driver.driverId
        },
        healthReports: healthReports.map(report => ({
          id: report.id,
          reportDate: report.reportDate,
          bloodPressureHigh: report.bloodPressureHigh,
          bloodPressureLow: report.bloodPressureLow,
          heartRate: report.heartRate,
          stressLevel: report.stressLevel,
          riskLevel: report.riskLevel,
          notes: report.notes
        })),
        monitoringSessions: monitoringSessions.map(session => ({
          session_id: session.session_id,
          sessionId: session.sessionId,
          startTime: session.startTime,
          endTime: session.endTime,
          status: session.status,
          healthReport: session.health_report_id ? {
            id: session.health_report_id,
            reportDate: session.reportDate,
            bloodPressureHigh: session.bloodPressureHigh,
            bloodPressureLow: session.bloodPressureLow,
            heartRate: session.heartRate,
            stressLevel: session.stressLevel,
            riskLevel: session.riskLevel,
            notes: session.health_notes
          } : null
        }))
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error retrieving health vitals:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve health vitals data' },
      { status: 500 }
    );
  }
}
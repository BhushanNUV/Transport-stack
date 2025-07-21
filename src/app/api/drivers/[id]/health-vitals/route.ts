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

    // Get the latest health report for this driver with full health vitals using raw query
    const latestHealthReportRaw = await prisma.$queryRaw<any[]>`
      SELECT 
        hr.*,
        d.id as driver_id,
        d.name as driver_name,
        d.driverId as driver_driverId,
        d.age as driver_age,
        d.weight as driver_weight,
        d.height as driver_height,
        d.gender as driver_gender,
        d.phone as driver_phone,
        d.address as driver_address
      FROM health_reports hr
      LEFT JOIN drivers d ON hr.driverId = d.id
      WHERE hr.driverId = ${id}
      ORDER BY hr.reportDate DESC
      LIMIT 1
    `;
    
    const latestHealthReport = latestHealthReportRaw.length > 0 ? latestHealthReportRaw[0] : null;

    // Get all health reports for this driver
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
        // Latest health report with all health vitals
        latestHealthReport: latestHealthReport ? {
          id: latestHealthReport.id,
          reportDate: latestHealthReport.reportDate,
          // Basic health metrics
          bloodPressureHigh: latestHealthReport.bloodPressureHigh,
          bloodPressureLow: latestHealthReport.bloodPressureLow,
          heartRate: latestHealthReport.heartRate,
          stressLevel: latestHealthReport.stressLevel,
          riskLevel: latestHealthReport.riskLevel,
          notes: latestHealthReport.notes,
          // Detailed health vitals from health_reports table
          heart_age: latestHealthReport.heart_age,
          ascvd_risk: latestHealthReport.ascvd_risk,
          low_hemoglobin_risk: latestHealthReport.low_hemoglobin_risk,
          high_total_cholesterol_risk: latestHealthReport.high_total_cholesterol_risk,
          high_fasting_glucose_risk: latestHealthReport.high_fasting_glucose_risk,
          heart_rate: latestHealthReport.heart_rate,
          breathing_rate: latestHealthReport.breathing_rate,
          prq: latestHealthReport.prq,
          oxygen_saturation: latestHealthReport.oxygen_saturation,
          blood_pressure: latestHealthReport.blood_pressure,
          stress_level: latestHealthReport.stress_level,
          recovery_ability: latestHealthReport.recovery_ability,
          stress_response: latestHealthReport.stress_response,
          respiration: latestHealthReport.respiration,
          hrv_sdnn: latestHealthReport.hrv_sdnn,
          hemoglobin: latestHealthReport.hemoglobin,
          hba1c: latestHealthReport.hba1c,
          heart_rate_conf_level: latestHealthReport.heart_rate_conf_level,
          breathing_rate_conf_level: latestHealthReport.breathing_rate_conf_level,
          prq_conf_level: latestHealthReport.prq_conf_level,
          hrv_sdnn_conf_level: latestHealthReport.hrv_sdnn_conf_level,
          license_key: latestHealthReport.license_key,
          hypertension_risk: latestHealthReport.hypertension_risk,
          diabetic_risk: latestHealthReport.diabetic_risk,
          // Driver basic info
          age: latestHealthReport.driver_age,
          weight: latestHealthReport.driver_weight,
          height: latestHealthReport.driver_height,
          // Calculate BMI if weight and height are available
          bmi: latestHealthReport.driver_weight && latestHealthReport.driver_height 
            ? (latestHealthReport.driver_weight / Math.pow(latestHealthReport.driver_height / 100, 2)).toFixed(1)
            : null
        } : null,
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
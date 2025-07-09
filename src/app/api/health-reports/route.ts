import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiResponse, PaginatedResponse } from '@/types';

// GET /api/health-reports - Get health reports from monitoring sessions with health vitals
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '15');
    const search = searchParams.get('search') || '';
    const riskLevel = searchParams.get('riskLevel') || '';
    const stressLevel = searchParams.get('stressLevel') || '';
    const dateRange = searchParams.get('dateRange') || '';

    const skip = (page - 1) * limit;

    // Note: For now using simplified query without filters to avoid SQL parameter issues
    // TODO: Add search, riskLevel, stressLevel, and dateRange filters when needed

    // Execute the main query using Prisma.sql for proper parameter binding
    const healthReports = await prisma.$queryRaw`
      SELECT DISTINCT
        ms.id as session_id,
        ms.sessionId,
        ms.driverId,
        ms.startTime,
        ms.endTime,
        ms.status as session_status,
        ms.totalImages,
        ms.averageRiskScore,
        ms.highRiskDetections,
        ms.alcoholDetections,
        ms.smokingDetections,
        ms.behaviorDetections,
        d.driverId as driver_code,
        d.name as driver_name,
        d.email,
        d.phone,
        d.age,
        d.gender,
        d.address,
        d.profilePhoto,
        d.dateOfBirth,
        d.weight,
        d.height,
        hr.id as health_report_id,
        hr.reportDate,
        hr.bloodPressureHigh,
        hr.bloodPressureLow,
        hr.heartRate,
        hr.stressLevel,
        hr.riskLevel,
        hr.notes,
        hr.heart_rate as hr_heart_rate,
        hr.breathing_rate,
        hr.oxygen_saturation,
        hr.blood_pressure,
        hr.stress_level as hr_stress_level,
        hr.recovery_ability,
        hr.hemoglobin,
        hr.hba1c,
        hr.hypertension_risk,
        hr.diabetic_risk,
        hr.createdAt as health_report_created,
        hr.updatedAt as health_report_updated
      FROM monitoring_sessions ms
      INNER JOIN drivers d ON ms.driverId = d.id
      LEFT JOIN health_reports hr ON ms.driverId = hr.driverId 
        AND DATE(ms.startTime) = DATE(hr.reportDate)
      WHERE ms.driverId IS NOT NULL
      ORDER BY ms.startTime DESC
      LIMIT ${limit} OFFSET ${skip}
    ` as Array<{
      session_id: string;
      sessionId: string;
      driverId: string;
      startTime: Date;
      endTime: Date | null;
      session_status: string;
      totalImages: number;
      averageRiskScore: number;
      highRiskDetections: number;
      alcoholDetections: number;
      smokingDetections: number;
      behaviorDetections: number;
      driver_code: string;
      driver_name: string;
      email: string;
      phone: string;
      age: number;
      gender: string;
      address: string | null;
      profilePhoto: string | null;
      dateOfBirth: Date | null;
      weight: number | null;
      height: number | null;
      health_report_id: string | null;
      reportDate: Date | null;
      bloodPressureHigh: number | null;
      bloodPressureLow: number | null;
      heartRate: number | null;
      stressLevel: string | null;
      riskLevel: string | null;
      notes: string | null;
      hr_heart_rate: string | null;
      breathing_rate: string | null;
      oxygen_saturation: string | null;
      blood_pressure: string | null;
      hr_stress_level: string | null;
      recovery_ability: string | null;
      hemoglobin: string | null;
      hba1c: string | null;
      hypertension_risk: string | null;
      diabetic_risk: string | null;
      health_report_created: Date | null;
      health_report_updated: Date | null;
    }>;

    // Get total count
    const totalResult = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT ms.id) as total
      FROM monitoring_sessions ms
      INNER JOIN drivers d ON ms.driverId = d.id
      LEFT JOIN health_reports hr ON ms.driverId = hr.driverId 
        AND DATE(ms.startTime) = DATE(hr.reportDate)
      WHERE ms.driverId IS NOT NULL
    ` as Array<{ total: bigint }>;
    const total = Number(totalResult[0]?.total || 0);

    // Transform the data to match the expected format
    const formattedReports = healthReports.map(report => ({
      id: report.health_report_id || report.session_id,
      reportDate: report.reportDate || report.startTime,
      bloodPressureHigh: report.bloodPressureHigh,
      bloodPressureLow: report.bloodPressureLow,
      heartRate: report.heartRate,
      stressLevel: report.stressLevel,
      riskLevel: report.riskLevel || 'NORMAL',
      notes: report.notes || `Session: ${report.sessionId}`,
      // Additional health data from new fields
      heart_rate: report.hr_heart_rate,
      breathing_rate: report.breathing_rate,
      oxygen_saturation: report.oxygen_saturation,
      blood_pressure: report.blood_pressure,
      stress_level: report.hr_stress_level,
      recovery_ability: report.recovery_ability,
      hemoglobin: report.hemoglobin,
      hba1c: report.hba1c,
      hypertension_risk: report.hypertension_risk,
      diabetic_risk: report.diabetic_risk,
      // Session data
      sessionId: report.sessionId,
      sessionStatus: report.session_status,
      totalImages: report.totalImages,
      averageRiskScore: report.averageRiskScore,
      highRiskDetections: report.highRiskDetections,
      alcoholDetections: report.alcoholDetections,
      smokingDetections: report.smokingDetections,
      behaviorDetections: report.behaviorDetections,
      createdAt: report.health_report_created || report.startTime,
      updatedAt: report.health_report_updated || report.endTime || report.startTime,
      driver: {
        id: report.driverId,
        driverId: report.driver_code,
        name: report.driver_name,
        email: report.email,
        phone: report.phone,
        age: report.age,
        gender: report.gender,
        address: report.address,
        profilePhoto: report.profilePhoto,
        dateOfBirth: report.dateOfBirth,
        weight: report.weight,
        height: report.height,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }));

    const response: PaginatedResponse<any> = {
      data: formattedReports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    return NextResponse.json({
      success: true,
      ...response,
    });
  } catch (error) {
    console.error('Error fetching health reports:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch health reports',
      },
      { status: 500 }
    );
  }
}

// POST /api/health-reports - Create a new health report
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      driverId,
      bloodPressureHigh,
      bloodPressureLow,
      heartRate,
      stressLevel,
      riskLevel,
      notes,
    } = body;

    // Validate required fields
    if (!driverId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Driver ID is required',
        },
        { status: 400 }
      );
    }

    // Check if driver exists
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
    });

    if (!driver) {
      return NextResponse.json(
        {
          success: false,
          error: 'Driver not found',
        },
        { status: 404 }
      );
    }

    // Auto-determine risk level if not provided
    let finalRiskLevel = riskLevel;
    if (!finalRiskLevel && bloodPressureHigh && bloodPressureLow && heartRate) {
      if (bloodPressureHigh >= 160 || bloodPressureLow >= 100 || heartRate > 110 || stressLevel === 'VERY_HIGH') {
        finalRiskLevel = 'CRITICAL';
      } else if (bloodPressureHigh >= 140 || bloodPressureLow >= 90 || heartRate > 100 || stressLevel === 'HIGH') {
        finalRiskLevel = 'HIGH';
      } else if (bloodPressureHigh >= 130 || bloodPressureLow >= 80 || heartRate > 90 || stressLevel === 'MILD') {
        finalRiskLevel = 'MEDIUM';
      } else if (bloodPressureHigh >= 120 || bloodPressureLow >= 70 || heartRate > 80) {
        finalRiskLevel = 'LOW';
      } else {
        finalRiskLevel = 'NORMAL';
      }
    } else if (!finalRiskLevel) {
      finalRiskLevel = 'NORMAL';
    }

    // Create health report
    const healthReport = await prisma.healthReport.create({
      data: {
        driverId,
        bloodPressureHigh: bloodPressureHigh || null,
        bloodPressureLow: bloodPressureLow || null,
        heartRate: heartRate || null,
        stressLevel: stressLevel || null,
        riskLevel: finalRiskLevel,
        notes: notes || null,
      },
      include: {
        driver: {
          select: {
            id: true,
            driverId: true,
            name: true,
            email: true,
            phone: true,
            age: true,
            gender: true,
            address: true,
            profilePhoto: true,
            dateOfBirth: true,
            weight: true,
            height: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    const response: ApiResponse<any> = {
      success: true,
      data: healthReport,
      message: 'Health report created successfully',
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating health report:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create health report',
      },
      { status: 500 }
    );
  }
}
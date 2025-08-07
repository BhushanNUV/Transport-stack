import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiResponse, PaginatedResponse } from '@/types';
import { checkAndCreateAlerts } from '@/lib/alertService';

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

    // Build the WHERE clause
    let whereClause = 'WHERE hr.id IS NOT NULL';
    const queryParams: any[] = [];
    
    if (search) {
      whereClause += ' AND (d.name LIKE ? OR d.driverId LIKE ?)';
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    // Execute the main query to get health reports directly from health_reports table only
    const query = `
      SELECT 
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
        hr.updatedAt as health_report_updated,
        hr.driverId,
        d.driverId as driver_code,
        d.name as driver_name,
        d.phone,
        d.age,
        d.gender,
        d.address,
        d.profilePhoto,
        d.dateOfBirth,
        d.weight,
        d.height
      FROM health_reports hr
      INNER JOIN drivers d ON hr.driverId = d.id
      ${whereClause}
      ORDER BY hr.reportDate DESC
      LIMIT ? OFFSET ?
    `;
    
    queryParams.push(limit, skip);
    
    const healthReports = await prisma.$queryRawUnsafe(query, ...queryParams) as Array<{
      health_report_id: string;
      reportDate: Date;
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
      health_report_created: Date;
      health_report_updated: Date;
      driverId: string;
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
    }>;

    // Get total count from health_reports table
    const countQuery = `
      SELECT COUNT(DISTINCT hr.id) as total
      FROM health_reports hr
      INNER JOIN drivers d ON hr.driverId = d.id
      ${whereClause}
    `;
    
    const countParams = search ? [`%${search}%`, `%${search}%`] : [];
    const totalResult = await prisma.$queryRawUnsafe(countQuery, ...countParams) as Array<{ total: bigint }>;
    const total = Number(totalResult[0]?.total || 0);

    // Transform the data to match the expected format
    const formattedReports = healthReports.map(report => ({
      id: report.health_report_id,
      reportDate: report.reportDate,
      bloodPressureHigh: report.bloodPressureHigh,
      bloodPressureLow: report.bloodPressureLow,
      heartRate: report.heartRate,
      stressLevel: report.stressLevel,
      riskLevel: report.riskLevel || 'NORMAL',
      notes: report.notes,
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
      // Timestamps
      createdAt: report.health_report_created,
      updatedAt: report.health_report_updated,
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
      // New health vitals fields
      heart_rate,
      breathing_rate,
      oxygen_saturation,
      hrv_sdnn,
      mean_rri,
      parasympathetic_ns,
      sns_index,
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

    // Create health report with all health vitals
    const healthReport = await prisma.healthReport.create({
      data: {
        driverId,
        bloodPressureHigh: bloodPressureHigh || null,
        bloodPressureLow: bloodPressureLow || null,
        heartRate: heartRate || null,
        stressLevel: stressLevel || null,
        riskLevel: finalRiskLevel,
        notes: notes || null,
        // Store new health vitals
        heart_rate: heart_rate?.toString() || null,
        breathing_rate: breathing_rate?.toString() || null,
        oxygen_saturation: oxygen_saturation?.toString() || null,
        hrv_sdnn: hrv_sdnn?.toString() || null,
        mean_rri: mean_rri?.toString() || null,
        parasympathetic_ns: parasympathetic_ns?.toString() || null,
        sns_index: sns_index?.toString() || null,
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
            organizationId: true,
          },
        },
      },
    });

    // Check health metrics and create alerts if needed
    if (driver.organizationId) {
      // Use new health vitals if available, otherwise fall back to old fields
      const metricsToCheck = {
        heartRate: heart_rate ? parseFloat(heart_rate) : (heartRate || undefined),
        breathingRate: breathing_rate ? parseFloat(breathing_rate) : undefined,
        oxygenSaturation: oxygen_saturation ? parseFloat(oxygen_saturation) : undefined,
        hrvSDNN: hrv_sdnn ? parseFloat(hrv_sdnn) : undefined,
        meanRRI: mean_rri ? parseFloat(mean_rri) : undefined,
        parasympathetic: parasympathetic_ns ? parseFloat(parasympathetic_ns) : undefined,
        snsIndex: sns_index ? parseFloat(sns_index) : 
                 (stressLevel === 'VERY_HIGH' ? 8 : 
                  stressLevel === 'HIGH' ? 6 : 
                  stressLevel === 'MILD' ? 4 : 
                  stressLevel === 'LOW' ? 2 : undefined),
      };

      await checkAndCreateAlerts(
        driverId,
        driver.name,
        metricsToCheck,
        driver.organizationId
      );
    }

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
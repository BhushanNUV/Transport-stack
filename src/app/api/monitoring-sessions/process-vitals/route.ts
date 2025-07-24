import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAndCreateAlerts, createAlcoholAlert, createDrowsinessAlert } from '@/lib/alertService';

// POST /api/monitoring-sessions/process-vitals - Process monitoring session vitals and create alerts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sessionId,
      driverId,
      heartRate,
      breathingRate,
      hrvSDNN,
      oxygenSaturation,
      meanRRI,
      parasympathetic,
      snsIndex,
      alcoholDetected,
      drowsinessDetected,
    } = body;

    // Validate required fields
    if (!sessionId || !driverId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session ID and Driver ID are required',
        },
        { status: 400 }
      );
    }

    // Get driver information
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      select: {
        id: true,
        name: true,
        organizationId: true,
      },
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

    if (!driver.organizationId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Driver organization not found',
        },
        { status: 400 }
      );
    }

    // Update health report if exists or create new one
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let healthReport = await prisma.healthReport.findFirst({
      where: {
        driverId: driver.id,
        reportDate: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });

    const updateData: any = {};
    
    // Update fields if provided
    if (heartRate !== undefined) updateData.heart_rate = heartRate.toString();
    if (breathingRate !== undefined) updateData.breathing_rate = breathingRate.toString();
    if (oxygenSaturation !== undefined) updateData.oxygen_saturation = oxygenSaturation.toString();
    if (hrvSDNN !== undefined) updateData.stress_level = hrvSDNN < 20 ? 'HIGH' : 'LOW';
    
    if (healthReport) {
      // Update existing report
      await prisma.healthReport.update({
        where: { id: healthReport.id },
        data: updateData,
      });
    } else {
      // Create new report with vitals
      healthReport = await prisma.healthReport.create({
        data: {
          driverId: driver.id,
          ...updateData,
          riskLevel: 'NORMAL', // Will be updated based on alerts
        },
      });
    }

    // Check all health metrics and create alerts
    const metrics = {
      heartRate,
      breathingRate,
      hrvSDNN,
      oxygenSaturation,
      meanRRI,
      parasympathetic,
      snsIndex,
      alcoholDetected,
      drowsinessDetected,
    };

    await checkAndCreateAlerts(
      driver.id,
      driver.name,
      metrics,
      driver.organizationId
    );

    // Create specific alerts for alcohol and drowsiness
    if (alcoholDetected) {
      await createAlcoholAlert(
        driver.id,
        driver.name,
        driver.organizationId,
        { sessionId, timestamp: new Date() }
      );
    }

    if (drowsinessDetected) {
      await createDrowsinessAlert(
        driver.id,
        driver.name,
        driver.organizationId,
        { sessionId, timestamp: new Date() }
      );
    }

    // Update risk level based on critical alerts
    const criticalAlerts = await prisma.systemAlert.count({
      where: {
        organizationId: driver.organizationId,
        metadata: {
          path: ['driverId'],
          equals: driver.id,
        },
        severity: 'CRITICAL',
        createdAt: {
          gte: today,
        },
      },
    });

    if (criticalAlerts > 0 && healthReport) {
      await prisma.healthReport.update({
        where: { id: healthReport.id },
        data: { riskLevel: 'CRITICAL' },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Vitals processed and alerts generated successfully',
      data: {
        healthReportId: healthReport?.id,
        alertsGenerated: criticalAlerts > 0,
      },
    });
  } catch (error) {
    console.error('Error processing monitoring session vitals:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process monitoring session vitals',
      },
      { status: 500 }
    );
  }
}
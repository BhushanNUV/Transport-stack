import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get('driverId');
    
    if (!driverId) {
      return NextResponse.json(
        { error: 'Driver ID is required as query parameter' },
        { status: 400 }
      );
    }
    
    const driver = await prisma.driver.findUnique({
      where: { id: driverId }
    });

    if (!driver) {
      return NextResponse.json(
        { error: 'Driver not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: driver
    });
  } catch (error) {
    console.error('Error retrieving health vitals:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve health vitals data' },
      { status: 500 }
    );
  }
}
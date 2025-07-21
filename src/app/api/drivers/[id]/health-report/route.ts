import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiResponse } from '@/types';

// Health report endpoint - fetches real data from health_reports table

// GET /api/drivers/[id]/health-report - Get detailed health report for a driver
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Try database first
    try {
      // Get driver with latest health report
      const driver = await prisma.driver.findUnique({
        where: { id },
        include: {
          healthReports: {
            orderBy: { reportDate: 'desc' },
            take: 1,
          },
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

      // Get recent alcohol detections (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const alcoholDetections = await prisma.alcoholDetection.findMany({
        where: {
          driverId: id,
          detectedAt: {
            gte: thirtyDaysAgo,
          },
        },
        orderBy: { detectedAt: 'desc' },
        take: 10,
      });

      // Get recent object detections (last 30 days)
      const objectDetections = await prisma.objectDetection.findMany({
        where: {
          driverId: id,
          detectedAt: {
            gte: thirtyDaysAgo,
          },
        },
        orderBy: { detectedAt: 'desc' },
        take: 10,
      });

      // Generate health recommendations based on data
      const recommendations = generateHealthRecommendations(
        driver,
        driver.healthReports[0],
        alcoholDetections,
        objectDetections
      );

      const healthData = {
        driver: {
          id: driver.id,
          driverId: driver.driverId,
          name: driver.name,
          email: driver.email,
          phone: driver.phone,
          age: driver.age,
          gender: driver.gender,
          address: driver.address,
          weight: driver.weight,
          height: driver.height,
        },
        latestReport: driver.healthReports[0] || null,
        alcoholDetections,
        objectDetections,
        recommendations,
      };

      const response: ApiResponse<any> = {
        success: true,
        data: healthData,
      };

      return NextResponse.json(response);
    } catch (dbError) {
      console.error('Database error fetching health report:', dbError);
      
      return NextResponse.json(
        {
          success: false,
          error: 'Database error occurred',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error fetching health report:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch health report',
      },
      { status: 500 }
    );
  }
}

function generateHealthRecommendations(
  driver: any,
  latestReport: any,
  alcoholDetections: any[],
  objectDetections: any[]
): string[] {
  const recommendations: string[] = [];

  if (!latestReport) {
    recommendations.push('Schedule a comprehensive health checkup to establish baseline metrics.');
    return recommendations;
  }

  // Blood pressure recommendations
  if (latestReport.bloodPressureHigh && latestReport.bloodPressureLow) {
    const systolic = latestReport.bloodPressureHigh;
    const diastolic = latestReport.bloodPressureLow;

    if (systolic >= 140 || diastolic >= 90) {
      recommendations.push('High blood pressure detected. Consult with a healthcare provider immediately.');
      recommendations.push('Reduce sodium intake and increase physical activity.');
      recommendations.push('Monitor blood pressure daily and maintain a log.');
    } else if (systolic >= 130 || diastolic >= 80) {
      recommendations.push('Elevated blood pressure. Consider lifestyle modifications to prevent hypertension.');
      recommendations.push('Implement stress reduction techniques such as meditation or deep breathing exercises.');
    }
  }

  // Heart rate recommendations
  if (latestReport.heartRate) {
    const heartRate = latestReport.heartRate;
    
    if (heartRate > 100) {
      recommendations.push('Elevated resting heart rate detected. Consider cardiovascular evaluation.');
      recommendations.push('Ensure adequate hydration and avoid excessive caffeine intake.');
    } else if (heartRate < 60 && driver.age > 40) {
      recommendations.push('Low heart rate detected. Monitor for symptoms of dizziness or fatigue.');
    }
  }

  // Stress level recommendations
  if (latestReport.stressLevel) {
    const stressLevel = latestReport.stressLevel;
    
    if (stressLevel === 'HIGH' || stressLevel === 'VERY_HIGH') {
      recommendations.push('High stress levels detected. Consider stress management counseling.');
      recommendations.push('Practice regular relaxation techniques and ensure adequate sleep (7-9 hours).');
      recommendations.push('Take regular breaks during long driving periods.');
    }
  }

  // Alcohol detection recommendations
  if (alcoholDetections.length > 0) {
    const recentAlcoholDetections = alcoholDetections.filter(d => {
      const detectionDate = new Date(d.detectedAt);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return detectionDate >= sevenDaysAgo;
    });

    if (recentAlcoholDetections.length > 0) {
      recommendations.push('Recent alcohol detection incidents require immediate attention.');
      recommendations.push('Mandatory alcohol counseling and support program enrollment recommended.');
      recommendations.push('Consider implementing additional monitoring and support measures.');
    }
  }

  // Object detection recommendations
  if (objectDetections.length > 0) {
    const phoneDetections = objectDetections.filter(d => d.objectType.toLowerCase().includes('phone'));
    const foodDetections = objectDetections.filter(d => 
      d.objectType.toLowerCase().includes('food') || d.objectType.toLowerCase().includes('drink')
    );

    if (phoneDetections.length > 2) {
      recommendations.push('Multiple phone usage detections. Review safe driving practices and hands-free policies.');
    }

    if (foodDetections.length > 2) {
      recommendations.push('Multiple eating/drinking detections while driving. Plan meal breaks before driving.');
    }
  }

  // Age-specific recommendations
  if (driver.age >= 55) {
    recommendations.push('Regular vision and hearing tests recommended for drivers over 55.');
    recommendations.push('Consider annual medical clearance for continued driving duties.');
  }

  // General recommendations
  if (recommendations.length === 0) {
    recommendations.push('Maintain current healthy habits and continue regular health monitoring.');
    recommendations.push('Stay hydrated and take regular breaks during long driving periods.');
  }

  // Weight and BMI recommendations
  if (driver.weight && driver.height) {
    const heightInMeters = driver.height / 100;
    const bmi = driver.weight / (heightInMeters * heightInMeters);

    if (bmi >= 30) {
      recommendations.push('Consider weight management program to improve overall health and driving comfort.');
    } else if (bmi >= 25) {
      recommendations.push('Maintain healthy weight through balanced diet and regular exercise.');
    }
  }

  return recommendations;
}
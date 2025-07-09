import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiResponse } from '@/types';

// Mock data for when database is not available
function getMockHealthData(driverId: string) {
  const mockDrivers = {
    '1': {
      driver: {
        id: '1',
        driverId: 'DRV-001',
        name: 'John Smith',
        email: 'john.smith@example.com',
        phone: '+1-555-0101',
        age: 35,
        gender: 'MALE',
        address: '123 Main St, Anytown, AT 12345',
        weight: 75.5,
        height: 180,
      },
      latestReport: {
        id: '1',
        driverId: '1',
        reportDate: new Date(),
        bloodPressureHigh: 140,
        bloodPressureLow: 90,
        heartRate: 85,
        stressLevel: 'MILD',
        riskLevel: 'MEDIUM',
        notes: 'Regular checkup, slight elevation in stress levels',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      alcoholDetections: [],
      objectDetections: [
        {
          id: '1',
          driverId: '1',
          detectedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          objectType: 'phone',
          confidence: 0.85,
          imageUrl: 'https://picsum.photos/400/300?random=1',
          location: 'Highway 101, Mile 25',
          severity: 'MEDIUM',
          notes: 'Phone usage detected during driving',
          createdAt: new Date(),
        }
      ],
      recommendations: [
        'Elevated blood pressure detected. Monitor daily and consult healthcare provider.',
        'Implement stress reduction techniques such as meditation or deep breathing exercises.',
        'Phone usage detected while driving. Review hands-free policies and safe driving practices.',
        'Take regular breaks during long driving periods to reduce stress and fatigue.'
      ]
    },
    '2': {
      driver: {
        id: '2',
        driverId: 'DRV-002',
        name: 'Sarah Johnson',
        email: 'sarah.johnson@example.com',
        phone: '+1-555-0102',
        age: 42,
        gender: 'FEMALE',
        address: '456 Oak Ave, Somewhere, ST 67890',
        weight: 65.0,
        height: 165,
      },
      latestReport: {
        id: '2',
        driverId: '2',
        reportDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        bloodPressureHigh: 160,
        bloodPressureLow: 100,
        heartRate: 105,
        stressLevel: 'HIGH',
        riskLevel: 'HIGH',
        notes: 'Elevated blood pressure and heart rate, recommend medical consultation',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      alcoholDetections: [],
      objectDetections: [],
      recommendations: [
        'High blood pressure detected. Consult with a healthcare provider immediately.',
        'Reduce sodium intake and increase physical activity.',
        'High stress levels detected. Consider stress management counseling.',
        'Monitor blood pressure daily and maintain a log.',
        'Take regular breaks during long driving periods.'
      ]
    },
    '3': {
      driver: {
        id: '3',
        driverId: 'DRV-003',
        name: 'Mike Davis',
        email: 'mike.davis@example.com',
        phone: '+1-555-0103',
        age: 29,
        gender: 'MALE',
        address: '789 Pine Rd, Elsewhere, ET 34567',
        weight: 82.3,
        height: 175,
      },
      latestReport: {
        id: '3',
        driverId: '3',
        reportDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        bloodPressureHigh: 120,
        bloodPressureLow: 75,
        heartRate: 72,
        stressLevel: 'LOW',
        riskLevel: 'NORMAL',
        notes: 'Excellent health indicators',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      alcoholDetections: [],
      objectDetections: [],
      recommendations: [
        'Maintain current healthy habits and continue regular health monitoring.',
        'Stay hydrated and take regular breaks during long driving periods.',
        'Excellent health indicators - keep up the good work!'
      ]
    }
  };

  return mockDrivers[driverId as keyof typeof mockDrivers] || null;
}

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
        // Try mock data if driver not found in database
        const mockData = getMockHealthData(id);
        if (mockData) {
          return NextResponse.json({
            success: true,
            data: mockData,
          });
        }
        
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
      console.warn('Database not available, using mock data for health report:', dbError);
      
      // Fallback to mock data
      const mockData = getMockHealthData(id);
      if (mockData) {
        return NextResponse.json({
          success: true,
          data: mockData,
        });
      }
      
      return NextResponse.json(
        {
          success: false,
          error: 'Driver not found',
        },
        { status: 404 }
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
import { NextRequest, NextResponse } from 'next/server';
import { checkAndCreateAlerts, createAlcoholAlert, createDrowsinessAlert } from '@/lib/alertService';
import alertStorage from '@/lib/alertStorage';
import { AlertType, AlertSeverity } from '@prisma/client';

// POST /api/alerts/test - Create test alerts
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    const organizationId = searchParams.get('organizationId') || 'org_default';

    const alerts = [];

    if (type === 'health' || type === 'all') {
      // Create health metric alerts
      await checkAndCreateAlerts(
        'test-driver-1',
        'Test Driver 1',
        {
          heartRate: 120, // Above normal
          breathingRate: 25, // Above normal
          hrvSDNN: 15, // Below normal (high stress)
          oxygenSaturation: 88, // Below normal
          snsIndex: 7, // Above normal (high stress)
        },
        organizationId
      );

      // Also create a direct health alert
      const healthAlert = alertStorage.createAlert({
        title: 'High Blood Pressure Detected',
        message: 'Test Driver 2 has recorded blood pressure of 180/95 mmHg',
        type: AlertType.HEALTH,
        severity: AlertSeverity.ERROR,
        isRead: false,
        targetRole: null,
        organizationId,
        metadata: {
          driverId: 'test-driver-2',
          driverName: 'Test Driver 2',
          parameter: 'Blood Pressure',
          value: '180/95',
          unit: 'mmHg'
        }
      });
      alerts.push(healthAlert);
    }

    if (type === 'alcohol' || type === 'all') {
      // Create alcohol detection alert
      await createAlcoholAlert(
        'test-driver-3',
        'Test Driver 3',
        organizationId,
        { confidence: 0.85, timestamp: new Date() }
      );
    }

    if (type === 'drowsiness' || type === 'all') {
      // Create drowsiness alert
      await createDrowsinessAlert(
        'test-driver-4',
        'Test Driver 4',
        organizationId,
        { confidence: 0.92, timestamp: new Date() }
      );
    }

    if (type === 'attendance' || type === 'all') {
      // Create attendance alert
      const attendanceAlert = alertStorage.createAlert({
        title: 'Late Check-in',
        message: 'Test Driver 5 checked in 30 minutes late for duty',
        type: AlertType.ATTENDANCE,
        severity: AlertSeverity.INFO,
        isRead: false,
        targetRole: null,
        organizationId,
        metadata: {
          driverId: 'test-driver-5',
          driverName: 'Test Driver 5',
          lateMinutes: 30
        }
      });
      alerts.push(attendanceAlert);
    }

    if (type === 'object' || type === 'all') {
      // Create object detection alert
      const objectAlert = alertStorage.createAlert({
        title: 'Phone Usage Detected',
        message: 'Test Driver 6 was detected using phone while driving',
        type: AlertType.OBJECT_DETECTION,
        severity: AlertSeverity.WARNING,
        isRead: false,
        targetRole: null,
        organizationId,
        metadata: {
          driverId: 'test-driver-6',
          driverName: 'Test Driver 6',
          objectType: 'phone',
          confidence: 0.89
        }
      });
      alerts.push(objectAlert);
    }

    if (type === 'system' || type === 'all') {
      // Create system alert
      const systemAlert = alertStorage.createAlert({
        title: 'System Maintenance',
        message: 'Scheduled system maintenance will begin at 2:00 AM tonight',
        type: AlertType.SYSTEM,
        severity: AlertSeverity.INFO,
        isRead: false,
        targetRole: null,
        organizationId,
        metadata: {
          maintenanceType: 'scheduled',
          duration: '2 hours'
        }
      });
      alerts.push(systemAlert);
    }

    // Get all alerts for this organization
    const { alerts: allAlerts } = alertStorage.getAlerts({ organizationId });

    return NextResponse.json({
      success: true,
      message: `Created test alerts of type: ${type}`,
      data: {
        newAlerts: alerts.length,
        totalAlerts: allAlerts.length
      }
    });
  } catch (error) {
    console.error('Error creating test alerts:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create test alerts',
      },
      { status: 500 }
    );
  }
}

// GET /api/alerts/test - Get alert statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId') || 'org_default';

    const stats = alertStorage.getAlertStats(organizationId);

    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting alert stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get alert stats',
      },
      { status: 500 }
    );
  }
}
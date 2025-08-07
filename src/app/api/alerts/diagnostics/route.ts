import { NextRequest, NextResponse } from 'next/server';
import alertStorage from '@/lib/alertStorage';
import notificationStorage from '@/lib/notificationStorage';
import { checkAndCreateAlerts } from '@/lib/alertService';

// Default organization ID for demo purposes
const DEFAULT_ORG_ID = 'org_default';

// GET /api/alerts/diagnostics - Run diagnostics on alert system
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const verbose = searchParams.get('verbose') === 'true';
    
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      system: {
        alertStorageLoaded: true,
        notificationStorageLoaded: true,
      },
      tests: [],
    };

    // Test 1: Can retrieve alerts
    try {
      const { alerts, total } = alertStorage.getAlerts({ 
        organizationId: DEFAULT_ORG_ID,
        limit: 5 
      });
      diagnostics.tests.push({
        name: 'Retrieve Alerts',
        success: true,
        result: {
          count: total,
          sample: verbose ? alerts.slice(0, 2) : undefined,
        },
      });
    } catch (error) {
      diagnostics.tests.push({
        name: 'Retrieve Alerts',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Test 2: Can retrieve notifications
    try {
      const { notifications, total } = notificationStorage.getNotifications({ 
        organizationId: DEFAULT_ORG_ID,
        limit: 5 
      });
      diagnostics.tests.push({
        name: 'Retrieve Notifications',
        success: true,
        result: {
          count: total,
          sample: verbose ? notifications.slice(0, 2) : undefined,
        },
      });
    } catch (error) {
      diagnostics.tests.push({
        name: 'Retrieve Notifications',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Test 3: Can create an alert
    try {
      const testAlert = alertStorage.createAlert({
        title: 'Diagnostic Test Alert',
        message: `Diagnostic test run at ${new Date().toISOString()}`,
        type: 'SYSTEM' as any,
        severity: 'INFO' as any,
        organizationId: DEFAULT_ORG_ID,
        isRead: false,
        targetRole: null,
        metadata: {
          isDiagnostic: true,
          timestamp: new Date().toISOString(),
        },
      });
      
      diagnostics.tests.push({
        name: 'Create Alert',
        success: true,
        result: {
          alertId: testAlert.id,
          created: true,
        },
      });

      // Clean up - delete the test alert
      alertStorage.deleteAlert(testAlert.id);
    } catch (error) {
      diagnostics.tests.push({
        name: 'Create Alert',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Test 4: Can create a notification
    try {
      const testNotification = notificationStorage.createNotification({
        title: 'Diagnostic Test Notification',
        message: `Diagnostic test run at ${new Date().toISOString()}`,
        type: 'info',
        organizationId: DEFAULT_ORG_ID,
        read: false,
        metadata: {
          isDiagnostic: true,
          timestamp: new Date().toISOString(),
        },
      });
      
      diagnostics.tests.push({
        name: 'Create Notification',
        success: true,
        result: {
          notificationId: testNotification.id,
          created: true,
        },
      });

      // Clean up - delete the test notification
      notificationStorage.deleteNotification(testNotification.id);
    } catch (error) {
      diagnostics.tests.push({
        name: 'Create Notification',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Test 5: Check alert service
    try {
      // This should trigger alert creation if thresholds are exceeded
      await checkAndCreateAlerts(
        'diagnostic-driver',
        'Diagnostic Driver',
        {
          heartRate: 75, // Normal, should not trigger
        },
        DEFAULT_ORG_ID
      );
      
      diagnostics.tests.push({
        name: 'Alert Service Check',
        success: true,
        result: {
          processed: true,
        },
      });
    } catch (error) {
      diagnostics.tests.push({
        name: 'Alert Service Check',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Calculate overall health
    const totalTests = diagnostics.tests.length;
    const successfulTests = diagnostics.tests.filter((t: any) => t.success).length;
    diagnostics.summary = {
      totalTests,
      successfulTests,
      failedTests: totalTests - successfulTests,
      healthStatus: successfulTests === totalTests ? 'HEALTHY' : 
                   successfulTests > totalTests / 2 ? 'DEGRADED' : 'UNHEALTHY',
    };

    return NextResponse.json(diagnostics);
  } catch (error) {
    console.error('Error running diagnostics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to run diagnostics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
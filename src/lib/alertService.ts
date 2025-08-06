import { HEALTH_THRESHOLDS, checkThreshold } from './alertThresholds';
import { AlertType, AlertSeverity } from '@prisma/client';
import alertStorage from './alertStorage';
import notificationStorage from './notificationStorage';

// Default organization ID for demo purposes
const DEFAULT_ORG_ID = 'org_default';

interface HealthMetrics {
  heartRate?: number;
  breathingRate?: number;
  hrvSDNN?: number;
  oxygenSaturation?: number;
  meanRRI?: number;
  parasympathetic?: number;
  snsIndex?: number;
  alcoholDetected?: boolean;
  drowsinessDetected?: boolean;
}

interface AlertCheck {
  parameter: string;
  value: number | boolean;
  threshold: keyof typeof HEALTH_THRESHOLDS;
  driverId: string;
  driverName: string;
}

// Track parameter instances for multi-instance thresholds
const parameterInstances: Map<string, Map<string, Date[]>> = new Map();

function trackParameterInstance(driverId: string, parameter: string): number {
  if (!parameterInstances.has(driverId)) {
    parameterInstances.set(driverId, new Map());
  }
  
  const driverInstances = parameterInstances.get(driverId)!;
  if (!driverInstances.has(parameter)) {
    driverInstances.set(parameter, []);
  }
  
  const instances = driverInstances.get(parameter)!;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Filter instances to only include today's
  const todayInstances = instances.filter(date => {
    const instanceDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return instanceDate.getTime() === today.getTime();
  });
  
  todayInstances.push(now);
  driverInstances.set(parameter, todayInstances);
  
  return todayInstances.length;
}

export async function checkAndCreateAlerts(
  driverId: string,
  driverName: string,
  metrics: HealthMetrics,
  organizationId?: string
): Promise<void> {
  const alertChecks: AlertCheck[] = [];

  // Map metrics to threshold checks
  if (metrics.heartRate !== undefined) {
    alertChecks.push({
      parameter: 'heartRate',
      value: metrics.heartRate,
      threshold: 'heartRate',
      driverId,
      driverName
    });
  }

  if (metrics.breathingRate !== undefined) {
    alertChecks.push({
      parameter: 'breathingRate',
      value: metrics.breathingRate,
      threshold: 'breathingRate',
      driverId,
      driverName
    });
  }

  if (metrics.hrvSDNN !== undefined) {
    alertChecks.push({
      parameter: 'hrvSDNN',
      value: metrics.hrvSDNN,
      threshold: 'hrvSDNN',
      driverId,
      driverName
    });
  }

  if (metrics.oxygenSaturation !== undefined) {
    alertChecks.push({
      parameter: 'oxygenSaturation',
      value: metrics.oxygenSaturation,
      threshold: 'oxygenSaturation',
      driverId,
      driverName
    });
  }

  if (metrics.meanRRI !== undefined) {
    alertChecks.push({
      parameter: 'meanRRI',
      value: metrics.meanRRI,
      threshold: 'meanRRI',
      driverId,
      driverName
    });
  }

  if (metrics.parasympathetic !== undefined) {
    alertChecks.push({
      parameter: 'parasympathetic',
      value: metrics.parasympathetic,
      threshold: 'parasympathetic',
      driverId,
      driverName
    });
  }

  if (metrics.snsIndex !== undefined) {
    alertChecks.push({
      parameter: 'snsIndex',
      value: metrics.snsIndex,
      threshold: 'snsIndex',
      driverId,
      driverName
    });
  }

  if (metrics.alcoholDetected !== undefined) {
    alertChecks.push({
      parameter: 'alcoholDetection',
      value: metrics.alcoholDetected,
      threshold: 'alcoholDetection',
      driverId,
      driverName
    });
  }

  if (metrics.drowsinessDetected !== undefined) {
    alertChecks.push({
      parameter: 'drowsinessDetection',
      value: metrics.drowsinessDetected,
      threshold: 'drowsinessDetection',
      driverId,
      driverName
    });
  }

  // Process each alert check
  for (const check of alertChecks) {
    const thresholdConfig = HEALTH_THRESHOLDS[check.threshold];
    const { isAlert, isCritical } = checkThreshold(check.threshold, check.value);

    if (isAlert) {
      const instanceCount = trackParameterInstance(driverId, check.parameter);
      
      // Only create alert if we've reached the required number of instances
      if (instanceCount >= thresholdConfig.flagInstances) {
        await createHealthAlert({
          driverId,
          driverName,
          parameter: thresholdConfig.parameter,
          value: check.value,
          threshold: check.threshold,
          isCritical,
          organizationId: organizationId || DEFAULT_ORG_ID,
          sendNotification: thresholdConfig.sendNotification
        });
      }
    }
  }
}

interface CreateAlertParams {
  driverId: string;
  driverName: string;
  parameter: string;
  value: number | boolean;
  threshold: keyof typeof HEALTH_THRESHOLDS;
  isCritical: boolean;
  organizationId: string;
  sendNotification: boolean;
}

async function createHealthAlert(params: CreateAlertParams): Promise<void> {
  const { driverId, driverName, parameter, value, threshold, isCritical, organizationId, sendNotification } = params;
  const thresholdConfig = HEALTH_THRESHOLDS[threshold];
  
  try {
    // Check if similar alert already exists in last hour
    const isDuplicate = alertStorage.checkForDuplicateAlert(
      organizationId,
      AlertType.HEALTH,
      parameter,
      60 // within last 60 minutes
    );

    if (isDuplicate) {
      return; // Don't create duplicate alerts
    }

    // Create the alert
    const alert = alertStorage.createAlert({
      title: `Critical Health Alert: ${parameter}`,
      message: thresholdConfig.alertMessage(value, driverName),
      type: AlertType.HEALTH,
      severity: isCritical ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
      organizationId,
      isRead: false,
      targetRole: null,
      metadata: {
        driverId,
        driverName,
        parameter,
        value: value.toString(),
        threshold: threshold,
        unit: thresholdConfig.unit,
        sendNotification
      }
    });

    // Create corresponding notification
    if (sendNotification) {
      notificationStorage.createFromAlert(alert, organizationId);
    }

    // If this is a critical alert, also update any critical cases tracking
    if (isCritical) {
      // This will be picked up by the dashboard's critical cases query
      console.log(`Critical alert created for ${driverName}: ${parameter} = ${value}${thresholdConfig.unit}`);
    }
  } catch (error) {
    console.error('Error creating health alert:', error);
  }
}

// Function to check alcohol detection alerts
export async function createAlcoholAlert(
  driverId: string,
  driverName: string,
  organizationId?: string,
  detectionData?: any
): Promise<void> {
  try {
    const orgId = organizationId || DEFAULT_ORG_ID;
    const alert = alertStorage.createAlert({
      title: 'Alcohol Detection Alert',
      message: `Alcohol detected for driver ${driverName}. Immediate action required.`,
      type: AlertType.ALCOHOL_DETECTION,
      severity: AlertSeverity.CRITICAL,
      organizationId: orgId,
      isRead: false,
      targetRole: null,
      metadata: {
        driverId,
        driverName,
        detectionData,
        sendNotification: true
      }
    });

    // Create corresponding notification
    notificationStorage.createFromAlert(alert, orgId);
  } catch (error) {
    console.error('Error creating alcohol alert:', error);
  }
}

// Function to check drowsiness detection alerts
export async function createDrowsinessAlert(
  driverId: string,
  driverName: string,
  organizationId?: string,
  detectionData?: any
): Promise<void> {
  try {
    const orgId = organizationId || DEFAULT_ORG_ID;
    const alert = alertStorage.createAlert({
      title: 'Drowsiness Detection Alert',
      message: `Drowsiness detected for driver ${driverName}. Safety check required.`,
      type: AlertType.SAFETY,
      severity: AlertSeverity.CRITICAL,
      organizationId: orgId,
      isRead: false,
      targetRole: null,
      metadata: {
        driverId,
        driverName,
        detectionData,
        sendNotification: true
      }
    });

    // Create corresponding notification
    notificationStorage.createFromAlert(alert, orgId);
  } catch (error) {
    console.error('Error creating drowsiness alert:', error);
  }
}
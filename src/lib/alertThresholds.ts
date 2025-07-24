// Health parameter thresholds and alert configuration
export interface AlertThreshold {
  parameter: string;
  normalRange: {
    min?: number;
    max?: number;
  };
  alertCondition: 'below' | 'above' | 'outside' | 'detected';
  flagInstances: number; // Number of instances required to trigger alert
  sendNotification: boolean;
  criticalAlert: boolean;
  alertMessage: (value: number | boolean, driverName: string) => string;
  unit: string;
}

export const HEALTH_THRESHOLDS: Record<string, AlertThreshold> = {
  heartRate: {
    parameter: 'Heart Rate',
    normalRange: { min: 60, max: 100 },
    alertCondition: 'outside',
    flagInstances: 1,
    sendNotification: true,
    criticalAlert: true,
    alertMessage: (value, driverName) => `${driverName}'s heart rate (${value} bpm) is outside normal range`,
    unit: 'bpm'
  },
  breathingRate: {
    parameter: 'Breathing Rate',
    normalRange: { min: 12, max: 20 },
    alertCondition: 'outside',
    flagInstances: 1,
    sendNotification: true,
    criticalAlert: true,
    alertMessage: (value, driverName) => `${driverName}'s breathing rate (${value} bpm) is outside normal range`,
    unit: 'bpm'
  },
  hrvSDNN: {
    parameter: 'HRV SDNN',
    normalRange: { min: 20 },
    alertCondition: 'below',
    flagInstances: 1,
    sendNotification: true,
    criticalAlert: true,
    alertMessage: (value, driverName) => `${driverName} is experiencing high stress (HRV SDNN: ${value} ms)`,
    unit: 'ms'
  },
  oxygenSaturation: {
    parameter: 'Oxygen Saturation',
    normalRange: { min: 90 },
    alertCondition: 'below',
    flagInstances: 1,
    sendNotification: true,
    criticalAlert: true,
    alertMessage: (value, driverName) => `${driverName}'s oxygen saturation (${value}%) is critically low`,
    unit: '%'
  },
  meanRRI: {
    parameter: 'Mean RRI',
    normalRange: { min: 600, max: 1200 },
    alertCondition: 'outside',
    flagInstances: 2,
    sendNotification: true,
    criticalAlert: true,
    alertMessage: (value, driverName) => `${driverName} is experiencing high stress (Mean RRI: ${value} ms)`,
    unit: 'ms'
  },
  parasympathetic: {
    parameter: 'Parasympathetic NS',
    normalRange: { min: 50 },
    alertCondition: 'below',
    flagInstances: 2,
    sendNotification: true,
    criticalAlert: true,
    alertMessage: (value, driverName) => `${driverName} is experiencing high stress (Parasympathetic HRV: ${value} ms)`,
    unit: 'ms HRV'
  },
  snsIndex: {
    parameter: 'SNS Index',
    normalRange: { max: 5 },
    alertCondition: 'above',
    flagInstances: 2,
    sendNotification: true,
    criticalAlert: true,
    alertMessage: (value, driverName) => `${driverName} is experiencing high stress (SNS Index: ${value})`,
    unit: ''
  },
  alcoholDetection: {
    parameter: 'Alcohol Detection',
    normalRange: {},
    alertCondition: 'detected',
    flagInstances: 1,
    sendNotification: true,
    criticalAlert: true,
    alertMessage: (_, driverName) => `Alcohol detected for driver ${driverName}`,
    unit: ''
  },
  drowsinessDetection: {
    parameter: 'Drowsiness Detection',
    normalRange: {},
    alertCondition: 'detected',
    flagInstances: 1,
    sendNotification: false,
    criticalAlert: true,
    alertMessage: (_, driverName) => `Drowsiness detected for driver ${driverName}`,
    unit: ''
  }
};

export function checkThreshold(
  parameter: keyof typeof HEALTH_THRESHOLDS,
  value: number | boolean
): { isAlert: boolean; isCritical: boolean } {
  const threshold = HEALTH_THRESHOLDS[parameter];
  if (!threshold) return { isAlert: false, isCritical: false };

  let isAlert = false;

  switch (threshold.alertCondition) {
    case 'below':
      isAlert = typeof value === 'number' && threshold.normalRange.min !== undefined && value < threshold.normalRange.min;
      break;
    case 'above':
      isAlert = typeof value === 'number' && threshold.normalRange.max !== undefined && value > threshold.normalRange.max;
      break;
    case 'outside':
      isAlert = typeof value === 'number' && (
        (threshold.normalRange.min !== undefined && value < threshold.normalRange.min) ||
        (threshold.normalRange.max !== undefined && value > threshold.normalRange.max)
      );
      break;
    case 'detected':
      isAlert = value === true;
      break;
  }

  return {
    isAlert,
    isCritical: isAlert && threshold.criticalAlert
  };
}
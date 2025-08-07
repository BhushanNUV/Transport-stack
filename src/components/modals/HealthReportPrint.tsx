'use client';

import { format } from 'date-fns';

interface PrintHealthReportProps {
  driver: any;
  healthVitals: any;
  latestReport: any;
  alcoholDetections: any[];
  objectDetections: any[];
  latestMonitoringSession: any;
  recommendations: string[];
}

export default function HealthReportPrint({
  driver,
  healthVitals,
  latestReport,
  alcoholDetections,
  objectDetections,
  latestMonitoringSession,
  recommendations,
}: PrintHealthReportProps) {
  const getRiskLevelText = (level: string) => {
    return level || 'No Data';
  };

  const getStressLevelText = (level: string) => {
    return level ? level.replace('_', ' ') : 'N/A';
  };

  return (
    <div className="print-content" id="health-report-print">
      {/* Header */}
      <div className="print-header">
        <h1>Driver Health Report</h1>
        <div className="print-meta">
          <p>Generated: {format(new Date(), 'MMMM dd, yyyy HH:mm')}</p>
          <p>Report ID: {`RPT-${Date.now()}`}</p>
        </div>
      </div>

      {/* Driver Information */}
      <div className="print-section">
        <h2>Driver Information</h2>
        <table className="print-table">
          <tbody>
            <tr>
              <td><strong>Name:</strong></td>
              <td>{driver.name}</td>
              <td><strong>ID:</strong></td>
              <td>{driver.driverId}</td>
            </tr>
            <tr>
              <td><strong>Age:</strong></td>
              <td>{driver.age} years</td>
              <td><strong>Gender:</strong></td>
              <td>{driver.gender}</td>
            </tr>
            <tr>
              <td><strong>Email:</strong></td>
              <td>{driver.email}</td>
              <td><strong>Phone:</strong></td>
              <td>{driver.phone}</td>
            </tr>
            {driver.address && (
              <tr>
                <td><strong>Address:</strong></td>
                <td colSpan={3}>{driver.address}</td>
              </tr>
            )}
            <tr>
              <td><strong>Weight:</strong></td>
              <td>{driver.weight ? `${driver.weight} kg` : 'N/A'}</td>
              <td><strong>Height:</strong></td>
              <td>{driver.height ? `${driver.height} cm` : 'N/A'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Risk Assessment */}
      <div className="print-section">
        <h2>Risk Assessment</h2>
        <table className="print-table">
          <tbody>
            <tr>
              <td><strong>Overall Risk Level:</strong></td>
              <td>{getRiskLevelText(latestReport?.riskLevel)}</td>
              <td><strong>Last Updated:</strong></td>
              <td>{latestReport ? format(new Date(latestReport.reportDate), 'MMM dd, yyyy HH:mm') : 'Never'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Basic Health Metrics */}
      {latestReport && (
        <div className="print-section">
          <h2>Basic Health Metrics</h2>
          <table className="print-table">
            <tbody>
              {latestReport.bloodPressureHigh && latestReport.bloodPressureLow && (
                <tr>
                  <td><strong>Blood Pressure:</strong></td>
                  <td>{latestReport.bloodPressureHigh}/{latestReport.bloodPressureLow} mmHg</td>
                  <td><strong>Status:</strong></td>
                  <td>
                    {latestReport.bloodPressureHigh >= 140 || latestReport.bloodPressureLow >= 90
                      ? 'High'
                      : latestReport.bloodPressureHigh < 90 || latestReport.bloodPressureLow < 60
                      ? 'Low'
                      : 'Normal'}
                  </td>
                </tr>
              )}
              {latestReport.heartRate && (
                <tr>
                  <td><strong>Heart Rate:</strong></td>
                  <td>{latestReport.heartRate} BPM</td>
                  <td><strong>Status:</strong></td>
                  <td>{latestReport.heartRate < 60 ? 'Low' : latestReport.heartRate > 100 ? 'High' : 'Normal'}</td>
                </tr>
              )}
              {latestReport.stressLevel && (
                <tr>
                  <td><strong>Stress Level:</strong></td>
                  <td colSpan={3}>{getStressLevelText(latestReport.stressLevel)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Comprehensive Health Vitals */}
      <div className="print-section">
        <h2>Comprehensive Health Vitals</h2>
        <table className="print-table">
          <tbody>
            <tr>
              <td><strong>BMI:</strong></td>
              <td>{healthVitals.bmi || 'N/A'}</td>
              <td><strong>Heart Age:</strong></td>
              <td>{healthVitals.heart_age || 'N/A'}</td>
            </tr>
            <tr>
              <td><strong>ASCVD Risk:</strong></td>
              <td>{healthVitals.ascvd_risk || 'N/A'}</td>
              <td><strong>Blood Pressure:</strong></td>
              <td>{healthVitals.blood_pressure || 'N/A'}</td>
            </tr>
            <tr>
              <td><strong>Heart Rate:</strong></td>
              <td>{healthVitals.heart_rate || 'N/A'}</td>
              <td><strong>Confidence:</strong></td>
              <td>{healthVitals.heart_rate_conf_level || 'N/A'}</td>
            </tr>
            <tr>
              <td><strong>Breathing Rate:</strong></td>
              <td>{healthVitals.breathing_rate || 'N/A'}</td>
              <td><strong>Confidence:</strong></td>
              <td>{healthVitals.breathing_rate_conf_level || 'N/A'}</td>
            </tr>
            <tr>
              <td><strong>PRQ:</strong></td>
              <td>{healthVitals.prq || 'N/A'}</td>
              <td><strong>Confidence:</strong></td>
              <td>{healthVitals.prq_conf_level || 'N/A'}</td>
            </tr>
            <tr>
              <td><strong>Oxygen Saturation:</strong></td>
              <td>{healthVitals.oxygen_saturation || 'N/A'}</td>
              <td><strong>Stress Level:</strong></td>
              <td>{healthVitals.stress_level || 'N/A'}</td>
            </tr>
            <tr>
              <td><strong>Recovery Ability:</strong></td>
              <td>{healthVitals.recovery_ability || 'N/A'}</td>
              <td><strong>Stress Response:</strong></td>
              <td>{healthVitals.stress_response || 'N/A'}</td>
            </tr>
            <tr>
              <td><strong>HRV SDNN:</strong></td>
              <td>{healthVitals.hrv_sdnn || 'N/A'}</td>
              <td><strong>Confidence:</strong></td>
              <td>{healthVitals.hrv_sdnn_conf_level || 'N/A'}</td>
            </tr>
            <tr>
              <td><strong>Hemoglobin:</strong></td>
              <td>{healthVitals.hemoglobin || 'N/A'}</td>
              <td><strong>HbA1c:</strong></td>
              <td>{healthVitals.hba1c || 'N/A'}</td>
            </tr>
            <tr>
              <td><strong>Respiration:</strong></td>
              <td colSpan={3}>{healthVitals.respiration || 'N/A'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Risk Assessments */}
      <div className="print-section">
        <h2>Health Risk Assessments</h2>
        <table className="print-table">
          <tbody>
            <tr>
              <td><strong>Low Hemoglobin Risk:</strong></td>
              <td>{healthVitals.low_hemoglobin_risk || 'N/A'}</td>
            </tr>
            <tr>
              <td><strong>High Cholesterol Risk:</strong></td>
              <td>{healthVitals.high_total_cholesterol_risk || 'N/A'}</td>
            </tr>
            <tr>
              <td><strong>High Glucose Risk:</strong></td>
              <td>{healthVitals.high_fasting_glucose_risk || 'N/A'}</td>
            </tr>
            <tr>
              <td><strong>Hypertension Risk:</strong></td>
              <td>{healthVitals.hypertension_risk || 'N/A'}</td>
            </tr>
            <tr>
              <td><strong>Diabetic Risk:</strong></td>
              <td>{healthVitals.diabetic_risk || 'N/A'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Detection Status */}
      <div className="print-section">
        <h2>Monitoring Detection Status</h2>
        <table className="print-table">
          <thead>
            <tr>
              <th>Detection Type</th>
              <th>Status</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Alcohol</td>
              <td>{latestMonitoringSession.alcohol_detected === 1 ? 'DETECTED' : 'NOT DETECTED'}</td>
              <td>{latestMonitoringSession.alcohol_detected === 1 ? 'Immediate action required' : 'Clear'}</td>
            </tr>
            <tr>
              <td>Smoking</td>
              <td>{latestMonitoringSession.smoking_detected === 1 ? 'DETECTED' : 'NOT DETECTED'}</td>
              <td>{latestMonitoringSession.smoking_detected === 1 ? 'Warning issued' : 'Clear'}</td>
            </tr>
            <tr>
              <td>Drowsiness</td>
              <td>{latestMonitoringSession.drowsy_detected === 1 ? 'DETECTED' : 'NOT DETECTED'}</td>
              <td>{latestMonitoringSession.drowsy_detected === 1 ? 'Rest recommended' : 'Alert'}</td>
            </tr>
            <tr>
              <td>Sleeping</td>
              <td>{latestMonitoringSession.sleeping_detected === 1 ? 'DETECTED' : 'NOT DETECTED'}</td>
              <td>{latestMonitoringSession.sleeping_detected === 1 ? 'Critical alert' : 'Awake'}</td>
            </tr>
            <tr>
              <td>Mobile Use</td>
              <td>{latestMonitoringSession.mobile_use_detected === 1 ? 'DETECTED' : 'NOT DETECTED'}</td>
              <td>{latestMonitoringSession.mobile_use_detected === 1 ? 'Safety violation' : 'Compliant'}</td>
            </tr>
            <tr>
              <td>Distraction</td>
              <td>{latestMonitoringSession.distracted_detected === 1 ? 'DETECTED' : 'NOT DETECTED'}</td>
              <td>{latestMonitoringSession.distracted_detected === 1 ? 'Attention required' : 'Focused'}</td>
            </tr>
            <tr>
              <td>Drinking</td>
              <td>{latestMonitoringSession.drinking_detected === 1 ? 'DETECTED' : 'NOT DETECTED'}</td>
              <td>{latestMonitoringSession.drinking_detected === 1 ? 'Hydration noted' : 'N/A'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Recent Alcohol Detections */}
      {alcoholDetections.length > 0 && (
        <div className="print-section">
          <h2>Recent Alcohol Detections</h2>
          <table className="print-table">
            <thead>
              <tr>
                <th>Date/Time</th>
                <th>Severity</th>
                <th>Confidence</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {alcoholDetections.slice(0, 5).map((detection, index) => (
                <tr key={index}>
                  <td>{format(new Date(detection.detectedAt), 'MMM dd, yyyy HH:mm')}</td>
                  <td>{detection.severity}</td>
                  <td>{(detection.confidence * 100).toFixed(1)}%</td>
                  <td>{detection.location || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recent Object Detections */}
      {objectDetections.length > 0 && (
        <div className="print-section">
          <h2>Recent Object Detections</h2>
          <table className="print-table">
            <thead>
              <tr>
                <th>Date/Time</th>
                <th>Object Type</th>
                <th>Confidence</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {objectDetections.slice(0, 5).map((detection, index) => (
                <tr key={index}>
                  <td>{format(new Date(detection.detectedAt), 'MMM dd, yyyy HH:mm')}</td>
                  <td>{detection.objectType}</td>
                  <td>{(detection.confidence * 100).toFixed(1)}%</td>
                  <td>{detection.location || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="print-section">
          <h2>Health Recommendations</h2>
          <ul className="print-list">
            {recommendations.map((recommendation, index) => (
              <li key={index}>{recommendation}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Medical Notes */}
      {latestReport?.notes && (
        <div className="print-section">
          <h2>Medical Notes</h2>
          <p>{latestReport.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="print-footer">
        <p>This report is confidential and intended for authorized personnel only.</p>
        <p>© {new Date().getFullYear()} Driver Health Dashboard - NUAI Transport Management System</p>
      </div>
    </div>
  );
}
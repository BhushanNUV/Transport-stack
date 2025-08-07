'use client';

import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { format } from 'date-fns';
import { 
  X, 
  Heart, 
  Activity, 
  AlertTriangle, 
  Calendar, 
  User, 
  Phone, 
  Mail,
  Printer,
  Camera,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Maximize2
} from 'lucide-react';
import { HealthReportWithDetails, AlcoholDetection, ObjectDetection } from '@/types';
import HealthReportPrint from './HealthReportPrint';
import ImageLightbox from './ImageLightbox';
import '@/styles/print.css';

interface HealthReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  driverId: string;
}

interface HealthData {
  driver: any;
  healthVitals: any;
  latestReport: any;
  alcoholDetections: AlcoholDetection[];
  objectDetections: ObjectDetection[];
  latestMonitoringSession: any;
  recommendations: string[];
}

export default function HealthReportModal({ isOpen, onClose, driverId }: HealthReportModalProps) {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string; description?: string } | null>(null);

  useEffect(() => {
    if (isOpen && driverId) {
      fetchHealthData();
    }
  }, [isOpen, driverId]);

  const fetchHealthData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch comprehensive driver data with health vitals and monitoring sessions
      const [driverResponse, healthVitalsResponse] = await Promise.all([
        fetch(`/api/drivers/${driverId}`),
        fetch(`/api/drivers/${driverId}/health-vitals`)
      ]);
      
      if (!driverResponse.ok) {
        throw new Error('Failed to fetch driver data');
      }
      
      const driverData = await driverResponse.json();
      const healthVitalsData = healthVitalsResponse.ok ? await healthVitalsResponse.json() : { data: null };
      
      // Combine the data
      const combinedData = {
        driver: driverData.data,
        healthVitals: healthVitalsData.data?.latestHealthReport || {
          // Default values if no health report exists
          age: driverData.data.age,
          weight: driverData.data.weight,
          height: driverData.data.height,
          bmi: driverData.data.weight && driverData.data.height 
            ? (driverData.data.weight / Math.pow(driverData.data.height / 100, 2)).toFixed(1)
            : null,
          // All other fields will be null/undefined if no health report exists
          heart_age: null,
          ascvd_risk: null,
          blood_pressure: null,
          heart_rate: null,
          breathing_rate: null,
          prq: null,
          oxygen_saturation: null,
          stress_level: null,
          recovery_ability: null,
          stress_response: null,
          respiration: null,
          hrv_sdnn: null,
          hemoglobin: null,
          hba1c: null,
          low_hemoglobin_risk: null,
          high_total_cholesterol_risk: null,
          high_fasting_glucose_risk: null,
          hypertension_risk: null,
          diabetic_risk: null,
          heart_rate_conf_level: null,
          breathing_rate_conf_level: null,
          prq_conf_level: null,
          hrv_sdnn_conf_level: null
        }, // Real health vitals data from health_reports table
        latestReport: driverData.data.healthReports?.[0] || null,
        alcoholDetections: driverData.data.alcoholDetections || [],
        objectDetections: driverData.data.objectDetections || [],
        latestMonitoringSession: driverData.data.latestMonitoringSession || {
          alcohol_detected: 0,
          smoking_detected: 0,
          drowsy_detected: 0,
          sleeping_detected: 0,
          mobile_use_detected: 0,
          distracted_detected: 0,
          drinking_detected: 0,
          alcohol_img_url: null,
          smoking_img_url: null,
          drowsy_img_url: null,
          sleeping_img_url: null,
          mobile_use_img_url: null,
          distracted_img_url: null,
          drinking_img_url: null
        },
        recommendations: []
      };
      
      setHealthData(combinedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    // Ensure data is loaded
    if (!healthData) {
      alert('Please wait for data to load');
      return;
    }
    
    // Destructure data for easier access
    const { driver, healthVitals, latestReport, latestMonitoringSession } = healthData;
    
    // Create print window
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups for printing');
      return;
    }
    
    // Generate print HTML
    const printHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Health Report - ${driver.name}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          h1 {
            text-align: center;
            color: #333;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
          }
          h2 {
            color: #555;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
            margin-top: 20px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f5f5f5;
            font-weight: bold;
          }
          tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          .header-info {
            text-align: center;
            margin-bottom: 20px;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
          @media print {
            body {
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <h1>Driver Health Report</h1>
        <div class="header-info">
          <p>Generated: ${format(new Date(), 'MMMM dd, yyyy HH:mm')}</p>
          <p>Report ID: RPT-${Date.now()}</p>
        </div>
        
        <h2>Driver Information</h2>
        <table>
          <tr>
            <td><strong>Name:</strong></td>
            <td>${driver.name}</td>
            <td><strong>ID:</strong></td>
            <td>${driver.driverId}</td>
          </tr>
          <tr>
            <td><strong>Age:</strong></td>
            <td>${driver.age} years</td>
            <td><strong>Gender:</strong></td>
            <td>${driver.gender}</td>
          </tr>
          <tr>
            <td><strong>Email:</strong></td>
            <td>${driver.email || 'N/A'}</td>
            <td><strong>Phone:</strong></td>
            <td>${driver.phone}</td>
          </tr>
          <tr>
            <td><strong>Weight:</strong></td>
            <td>${driver.weight ? driver.weight + ' kg' : 'N/A'}</td>
            <td><strong>Height:</strong></td>
            <td>${driver.height ? driver.height + ' cm' : 'N/A'}</td>
          </tr>
        </table>
        
        <h2>Risk Assessment</h2>
        <table>
          <tr>
            <td><strong>Overall Risk Level:</strong></td>
            <td>${latestReport?.riskLevel || 'NORMAL'}</td>
            <td><strong>Last Updated:</strong></td>
            <td>${latestReport ? format(new Date(latestReport.reportDate), 'MMM dd, yyyy HH:mm') : 'Never'}</td>
          </tr>
        </table>
        
        ${latestReport ? `
        <h2>Basic Health Metrics</h2>
        <table>
          ${latestReport.bloodPressureHigh && latestReport.bloodPressureLow ? `
          <tr>
            <td><strong>Blood Pressure:</strong></td>
            <td>${latestReport.bloodPressureHigh}/${latestReport.bloodPressureLow} mmHg</td>
            <td><strong>Status:</strong></td>
            <td>${latestReport.bloodPressureHigh >= 140 || latestReport.bloodPressureLow >= 90 ? 'High' : 
                 latestReport.bloodPressureHigh < 90 || latestReport.bloodPressureLow < 60 ? 'Low' : 'Normal'}</td>
          </tr>` : ''}
          ${latestReport.heartRate ? `
          <tr>
            <td><strong>Heart Rate:</strong></td>
            <td>${latestReport.heartRate} BPM</td>
            <td><strong>Status:</strong></td>
            <td>${latestReport.heartRate < 60 ? 'Low' : latestReport.heartRate > 100 ? 'High' : 'Normal'}</td>
          </tr>` : ''}
          ${latestReport.stressLevel ? `
          <tr>
            <td><strong>Stress Level:</strong></td>
            <td colspan="3">${latestReport.stressLevel.replace('_', ' ')}</td>
          </tr>` : ''}
        </table>` : ''}
        
        <h2>Comprehensive Health Vitals</h2>
        <table>
          <tr>
            <td><strong>BMI:</strong></td>
            <td>${healthVitals.bmi || 'N/A'}</td>
            <td><strong>Heart Age:</strong></td>
            <td>${healthVitals.heart_age || 'N/A'}</td>
          </tr>
          <tr>
            <td><strong>ASCVD Risk:</strong></td>
            <td>${healthVitals.ascvd_risk || 'N/A'}</td>
            <td><strong>Blood Pressure:</strong></td>
            <td>${healthVitals.blood_pressure || 'N/A'}</td>
          </tr>
          <tr>
            <td><strong>Heart Rate:</strong></td>
            <td>${healthVitals.heart_rate || 'N/A'}</td>
            <td><strong>Confidence:</strong></td>
            <td>${healthVitals.heart_rate_conf_level || 'N/A'}</td>
          </tr>
          <tr>
            <td><strong>Breathing Rate:</strong></td>
            <td>${healthVitals.breathing_rate || 'N/A'}</td>
            <td><strong>Confidence:</strong></td>
            <td>${healthVitals.breathing_rate_conf_level || 'N/A'}</td>
          </tr>
          <tr>
            <td><strong>PRQ:</strong></td>
            <td>${healthVitals.prq || 'N/A'}</td>
            <td><strong>Confidence:</strong></td>
            <td>${healthVitals.prq_conf_level || 'N/A'}</td>
          </tr>
          <tr>
            <td><strong>Oxygen Saturation:</strong></td>
            <td>${healthVitals.oxygen_saturation || 'N/A'}</td>
            <td><strong>Stress Level:</strong></td>
            <td>${healthVitals.stress_level || 'N/A'}</td>
          </tr>
          <tr>
            <td><strong>Recovery Ability:</strong></td>
            <td>${healthVitals.recovery_ability || 'N/A'}</td>
            <td><strong>Stress Response:</strong></td>
            <td>${healthVitals.stress_response || 'N/A'}</td>
          </tr>
          <tr>
            <td><strong>HRV SDNN:</strong></td>
            <td>${healthVitals.hrv_sdnn || 'N/A'}</td>
            <td><strong>Confidence:</strong></td>
            <td>${healthVitals.hrv_sdnn_conf_level || 'N/A'}</td>
          </tr>
          <tr>
            <td><strong>Hemoglobin:</strong></td>
            <td>${healthVitals.hemoglobin || 'N/A'}</td>
            <td><strong>HbA1c:</strong></td>
            <td>${healthVitals.hba1c || 'N/A'}</td>
          </tr>
          <tr>
            <td><strong>Respiration:</strong></td>
            <td colspan="3">${healthVitals.respiration || 'N/A'}</td>
          </tr>
        </table>
        
        <h2>Health Risk Assessments</h2>
        <table>
          <tr>
            <td><strong>Low Hemoglobin Risk:</strong></td>
            <td>${healthVitals.low_hemoglobin_risk || 'N/A'}</td>
          </tr>
          <tr>
            <td><strong>High Cholesterol Risk:</strong></td>
            <td>${healthVitals.high_total_cholesterol_risk || 'N/A'}</td>
          </tr>
          <tr>
            <td><strong>High Glucose Risk:</strong></td>
            <td>${healthVitals.high_fasting_glucose_risk || 'N/A'}</td>
          </tr>
          <tr>
            <td><strong>Hypertension Risk:</strong></td>
            <td>${healthVitals.hypertension_risk || 'N/A'}</td>
          </tr>
          <tr>
            <td><strong>Diabetic Risk:</strong></td>
            <td>${healthVitals.diabetic_risk || 'N/A'}</td>
          </tr>
        </table>
        
        <h2>Monitoring Detection Status</h2>
        <table>
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
              <td>${latestMonitoringSession.alcohol_detected === 1 ? 'DETECTED' : 'NOT DETECTED'}</td>
              <td>${latestMonitoringSession.alcohol_detected === 1 ? 'Immediate action required' : 'Clear'}</td>
            </tr>
            <tr>
              <td>Smoking</td>
              <td>${latestMonitoringSession.smoking_detected === 1 ? 'DETECTED' : 'NOT DETECTED'}</td>
              <td>${latestMonitoringSession.smoking_detected === 1 ? 'Warning issued' : 'Clear'}</td>
            </tr>
            <tr>
              <td>Drowsiness</td>
              <td>${latestMonitoringSession.drowsy_detected === 1 ? 'DETECTED' : 'NOT DETECTED'}</td>
              <td>${latestMonitoringSession.drowsy_detected === 1 ? 'Rest recommended' : 'Alert'}</td>
            </tr>
            <tr>
              <td>Sleeping</td>
              <td>${latestMonitoringSession.sleeping_detected === 1 ? 'DETECTED' : 'NOT DETECTED'}</td>
              <td>${latestMonitoringSession.sleeping_detected === 1 ? 'Critical alert' : 'Awake'}</td>
            </tr>
            <tr>
              <td>Mobile Use</td>
              <td>${latestMonitoringSession.mobile_use_detected === 1 ? 'DETECTED' : 'NOT DETECTED'}</td>
              <td>${latestMonitoringSession.mobile_use_detected === 1 ? 'Safety violation' : 'Compliant'}</td>
            </tr>
            <tr>
              <td>Distraction</td>
              <td>${latestMonitoringSession.distracted_detected === 1 ? 'DETECTED' : 'NOT DETECTED'}</td>
              <td>${latestMonitoringSession.distracted_detected === 1 ? 'Attention required' : 'Focused'}</td>
            </tr>
            <tr>
              <td>Drinking</td>
              <td>${latestMonitoringSession.drinking_detected === 1 ? 'DETECTED' : 'NOT DETECTED'}</td>
              <td>${latestMonitoringSession.drinking_detected === 1 ? 'Hydration noted' : 'N/A'}</td>
            </tr>
          </tbody>
        </table>
        
        ${latestReport?.notes ? `
        <h2>Medical Notes</h2>
        <p>${latestReport.notes}</p>` : ''}
        
        <div class="footer">
          <p>This report is confidential and intended for authorized personnel only.</p>
          <p>© ${new Date().getFullYear()} Driver Health Dashboard - NUAI Transport Management System</p>
        </div>
      </body>
      </html>
    `;
    
    // Write content and print
    printWindow.document.write(printHTML);
    printWindow.document.close();
    
    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.print();
      printWindow.onafterprint = () => {
        printWindow.close();
      };
    };
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'NORMAL': return 'text-green-600 bg-green-50';
      case 'LOW': return 'text-yellow-600 bg-yellow-50';
      case 'MEDIUM': return 'text-orange-600 bg-orange-50';
      case 'HIGH': return 'text-red-600 bg-red-50';
      case 'CRITICAL': return 'text-red-800 bg-red-100';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStressLevelColor = (level: string) => {
    switch (level) {
      case 'LOW': return 'text-green-600';
      case 'NORMAL': return 'text-blue-600';
      case 'MILD': return 'text-yellow-600';
      case 'HIGH': return 'text-orange-600';
      case 'VERY_HIGH': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getHeartRateStatus = (heartRate: number) => {
    if (heartRate < 60) return { status: 'Low', color: 'text-blue-600', icon: TrendingDown };
    if (heartRate > 100) return { status: 'High', color: 'text-red-600', icon: TrendingUp };
    return { status: 'Normal', color: 'text-green-600', icon: Minus };
  };

  const getBloodPressureStatus = (systolic: number, diastolic: number) => {
    if (systolic >= 140 || diastolic >= 90) {
      return { status: 'High', color: 'text-red-600', icon: TrendingUp };
    }
    if (systolic < 90 || diastolic < 60) {
      return { status: 'Low', color: 'text-blue-600', icon: TrendingDown };
    }
    return { status: 'Normal', color: 'text-green-600', icon: Minus };
  };

  if (loading) {
    return (
      <Dialog.Root open={isOpen} onOpenChange={onClose}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden z-50">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  if (error) {
    return (
      <Dialog.Root open={isOpen} onOpenChange={onClose}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl max-w-md w-full p-6 z-50">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Data</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  if (!healthData) return null;

  const { driver, healthVitals, latestReport, alcoholDetections, objectDetections, latestMonitoringSession, recommendations } = healthData;
  
  const heartRateStatus = latestReport?.heartRate ? getHeartRateStatus(latestReport.heartRate) : null;
  const bpStatus = latestReport?.bloodPressureHigh && latestReport?.bloodPressureLow 
    ? getBloodPressureStatus(latestReport.bloodPressureHigh, latestReport.bloodPressureLow)
    : null;

  return (
    <>
      <Dialog.Root open={isOpen} onOpenChange={onClose}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 print:hidden">
            <div className="flex items-center space-x-3">
              <User className="h-6 w-6 text-blue-600" />
              <div>
                <Dialog.Title className="text-xl font-semibold text-gray-900">
                  Health Report - {driver.name}
                </Dialog.Title>
                <p className="text-sm text-gray-600">ID: {driver.driverId}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrint}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
              >
                <Printer className="h-4 w-4" />
                <span>Print</span>
              </button>
              <Dialog.Close asChild>
                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md">
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
            <div className="p-6 space-y-6">
              {/* Driver Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-slate-900 mb-4">Driver Information</h3>
                  
                  {/* Profile Photo and Basic Info */}
                  <div className="flex items-start space-x-4 mb-4">
                    <div className="flex-shrink-0">
                      {driver.profilePhotoUrl ? (
                        <img
                          src={driver.profilePhotoUrl}
                          alt={driver.name}
                          className="h-16 w-16 rounded-full object-cover border-2 border-slate-200"
                        />
                      ) : (
                        <div className="h-16 w-16 bg-slate-200 rounded-full flex items-center justify-center border-2 border-slate-200">
                          <User className="h-8 w-8 text-slate-500" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-lg font-semibold text-slate-900 truncate">{driver.name}</h4>
                      <p className="text-sm text-slate-600">ID: {driver.driverId}</p>
                      <p className="text-sm text-slate-600">{driver.age} years, {driver.gender}</p>
                    </div>
                  </div>

                  {/* Contact Details */}
                  <div className="space-y-3 pt-3 border-t border-slate-200">
                    <div className="flex items-center space-x-2 text-sm text-slate-700">
                      <Mail className="h-4 w-4 text-slate-500 flex-shrink-0" />
                      <span className="font-medium text-slate-800">Email:</span>
                      <span className="text-slate-900 truncate">{driver.email}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-slate-700">
                      <Phone className="h-4 w-4 text-slate-500 flex-shrink-0" />
                      <span className="font-medium text-slate-800">Phone:</span>
                      <span className="text-slate-900">{driver.phone}</span>
                    </div>
                    {driver.address && (
                      <div className="flex items-start space-x-2 text-sm text-slate-700">
                        <span className="font-medium text-slate-800 mt-0.5">Address:</span>
                        <span className="text-slate-900 flex-1">{driver.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Risk Level */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-slate-900 mb-3">Overall Risk Assessment</h3>
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskLevelColor(latestReport?.riskLevel || 'NORMAL')}`}>
                      {latestReport?.riskLevel || 'No Data'}
                    </span>
                    <span className="text-sm text-slate-600">
                      Last updated: {latestReport ? format(new Date(latestReport.reportDate), 'MMM dd, yyyy HH:mm') : 'Never'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Health Metrics */}
              {latestReport && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-slate-900 mb-4">Latest Health Metrics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Blood Pressure */}
                    {latestReport.bloodPressureHigh && latestReport.bloodPressureLow && (
                      <div className="text-center">
                        <div className="flex justify-center mb-2">
                          <Heart className="h-8 w-8 text-red-500" />
                        </div>
                        <h4 className="font-medium text-slate-900">Blood Pressure</h4>
                        <p className="text-2xl font-bold text-slate-900">
                          {latestReport.bloodPressureHigh}/{latestReport.bloodPressureLow}
                        </p>
                        {bpStatus && (
                          <div className={`flex items-center justify-center space-x-1 ${bpStatus.color}`}>
                            <bpStatus.icon className="h-4 w-4" />
                            <span className="text-sm font-medium">{bpStatus.status}</span>
                          </div>
                        )}
                        <p className="text-xs text-slate-500 mt-1">mmHg</p>
                      </div>
                    )}

                    {/* Heart Rate */}
                    {latestReport.heartRate && (
                      <div className="text-center">
                        <div className="flex justify-center mb-2">
                          <Activity className="h-8 w-8 text-blue-500" />
                        </div>
                        <h4 className="font-medium text-slate-900">Heart Rate</h4>
                        <p className="text-2xl font-bold text-slate-900">{latestReport.heartRate}</p>
                        {heartRateStatus && (
                          <div className={`flex items-center justify-center space-x-1 ${heartRateStatus.color}`}>
                            <heartRateStatus.icon className="h-4 w-4" />
                            <span className="text-sm font-medium">{heartRateStatus.status}</span>
                          </div>
                        )}
                        <p className="text-xs text-slate-500 mt-1">BPM</p>
                      </div>
                    )}

                    {/* Stress Level */}
                    {latestReport.stressLevel && (
                      <div className="text-center">
                        <div className="flex justify-center mb-2">
                          <AlertTriangle className="h-8 w-8 text-yellow-500" />
                        </div>
                        <h4 className="font-medium text-slate-900">Stress Level</h4>
                        <p className={`text-2xl font-bold ${getStressLevelColor(latestReport.stressLevel)}`}>
                          {latestReport.stressLevel.replace('_', ' ')}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">Current Status</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Comprehensive Health Vitals */}
              {true && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-slate-900 mb-4">Complete Health Vitals</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Basic Physical Data */}
                    <div className="bg-blue-50 p-3 rounded-md">
                      <h4 className="font-medium text-slate-700 text-sm">Age</h4>
                      <p className="text-lg font-semibold text-slate-900">{healthVitals.age || 'N/A'} years</p>
                    </div>
                    
                    <div className="bg-blue-50 p-3 rounded-md">
                      <h4 className="font-medium text-slate-700 text-sm">Weight</h4>
                      <p className="text-lg font-semibold text-slate-900">{healthVitals.weight ? `${healthVitals.weight} kg` : 'N/A'}</p>
                    </div>
                    
                    <div className="bg-blue-50 p-3 rounded-md">
                      <h4 className="font-medium text-slate-700 text-sm">Height</h4>
                      <p className="text-lg font-semibold text-slate-900">{healthVitals.height ? `${healthVitals.height} cm` : 'N/A'}</p>
                    </div>
                    
                    <div className="bg-blue-50 p-3 rounded-md">
                      <h4 className="font-medium text-slate-700 text-sm">BMI</h4>
                      <p className="text-lg font-semibold text-slate-900">{healthVitals.bmi || 'N/A'}</p>
                      {healthVitals.bmi && (
                        <p className="text-xs text-slate-500">
                          {parseFloat(healthVitals.bmi) < 18.5 ? 'Underweight' : 
                           parseFloat(healthVitals.bmi) < 25 ? 'Normal' : 
                           parseFloat(healthVitals.bmi) < 30 ? 'Overweight' : 'Obese'}
                        </p>
                      )}
                    </div>
                    
                    {/* Heart Age */}
                    <div className="bg-gray-50 p-3 rounded-md">
                      <h4 className="font-medium text-slate-700 text-sm">Heart Age</h4>
                      <p className="text-lg font-semibold text-slate-900">{healthVitals.heart_age || 'N/A'}</p>
                    </div>
                    
                    {/* ASCVD Risk */}
                    <div className="bg-gray-50 p-3 rounded-md">
                      <h4 className="font-medium text-slate-700 text-sm">ASCVD Risk</h4>
                      <p className="text-lg font-semibold text-slate-900">{healthVitals.ascvd_risk || 'N/A'}</p>
                    </div>
                    
                    {/* Blood Pressure */}
                    <div className="bg-gray-50 p-3 rounded-md">
                      <h4 className="font-medium text-slate-700 text-sm">Blood Pressure</h4>
                      <p className="text-lg font-semibold text-slate-900">{healthVitals.blood_pressure || 'N/A'}</p>
                    </div>
                    
                    {/* Heart Rate */}
                    <div className="bg-gray-50 p-3 rounded-md">
                      <h4 className="font-medium text-slate-700 text-sm">Heart Rate</h4>
                      <p className="text-lg font-semibold text-slate-900">{healthVitals.heart_rate || 'N/A'}</p>
                      {healthVitals.heart_rate_conf_level && (
                        <p className="text-xs text-slate-500">Confidence: {healthVitals.heart_rate_conf_level}</p>
                      )}
                    </div>
                    
                    {/* Breathing Rate */}
                    <div className="bg-gray-50 p-3 rounded-md">
                      <h4 className="font-medium text-slate-700 text-sm">Breathing Rate</h4>
                      <p className="text-lg font-semibold text-slate-900">{healthVitals.breathing_rate || 'N/A'}</p>
                      {healthVitals.breathing_rate_conf_level && (
                        <p className="text-xs text-slate-500">Confidence: {healthVitals.breathing_rate_conf_level}</p>
                      )}
                    </div>
                    
                    {/* PRQ */}
                    <div className="bg-gray-50 p-3 rounded-md">
                      <h4 className="font-medium text-slate-700 text-sm">PRQ</h4>
                      <p className="text-lg font-semibold text-slate-900">{healthVitals.prq || 'N/A'}</p>
                      {healthVitals.prq_conf_level && (
                        <p className="text-xs text-slate-500">Confidence: {healthVitals.prq_conf_level}</p>
                      )}
                    </div>
                    
                    {/* Oxygen Saturation */}
                    <div className="bg-gray-50 p-3 rounded-md">
                      <h4 className="font-medium text-slate-700 text-sm">Oxygen Saturation</h4>
                      <p className="text-lg font-semibold text-slate-900">{healthVitals.oxygen_saturation || 'N/A'}</p>
                    </div>
                    
                    {/* Stress Level */}
                    <div className="bg-gray-50 p-3 rounded-md">
                      <h4 className="font-medium text-slate-700 text-sm">Stress Level</h4>
                      <p className="text-lg font-semibold text-slate-900">{healthVitals.stress_level || 'N/A'}</p>
                    </div>
                    
                    {/* Recovery Ability */}
                    <div className="bg-gray-50 p-3 rounded-md">
                      <h4 className="font-medium text-slate-700 text-sm">Recovery Ability</h4>
                      <p className="text-lg font-semibold text-slate-900">{healthVitals.recovery_ability || 'N/A'}</p>
                    </div>
                    
                    {/* HRV SDNN */}
                    <div className="bg-gray-50 p-3 rounded-md">
                      <h4 className="font-medium text-slate-700 text-sm">HRV SDNN</h4>
                      <p className="text-lg font-semibold text-slate-900">{healthVitals.hrv_sdnn || 'N/A'}</p>
                      {healthVitals.hrv_sdnn_conf_level && (
                        <p className="text-xs text-slate-500">Confidence: {healthVitals.hrv_sdnn_conf_level}</p>
                      )}
                    </div>
                    
                    {/* Hemoglobin */}
                    <div className="bg-gray-50 p-3 rounded-md">
                      <h4 className="font-medium text-slate-700 text-sm">Hemoglobin</h4>
                      <p className="text-lg font-semibold text-slate-900">{healthVitals.hemoglobin || 'N/A'}</p>
                    </div>
                    
                    {/* HbA1c */}
                    <div className="bg-gray-50 p-3 rounded-md">
                      <h4 className="font-medium text-slate-700 text-sm">HbA1c</h4>
                      <p className="text-lg font-semibold text-slate-900">{healthVitals.hba1c || 'N/A'}</p>
                    </div>
                    
                    {/* Stress Response */}
                    <div className="bg-gray-50 p-3 rounded-md">
                      <h4 className="font-medium text-slate-700 text-sm">Stress Response</h4>
                      <p className="text-lg font-semibold text-slate-900">{healthVitals.stress_response || 'N/A'}</p>
                    </div>
                    
                    {/* Respiration */}
                    <div className="bg-gray-50 p-3 rounded-md">
                      <h4 className="font-medium text-slate-700 text-sm">Respiration</h4>
                      <p className="text-lg font-semibold text-slate-900">{healthVitals.respiration || 'N/A'}</p>
                    </div>
                    
                    {/* Risk Assessments */}
                    <div className="bg-gray-50 p-3 rounded-md">
                      <h4 className="font-medium text-slate-700 text-sm">Low Hemoglobin Risk</h4>
                      <p className="text-lg font-semibold text-slate-900">{healthVitals.low_hemoglobin_risk || 'N/A'}</p>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-md">
                      <h4 className="font-medium text-slate-700 text-sm">High Cholesterol Risk</h4>
                      <p className="text-lg font-semibold text-slate-900">{healthVitals.high_total_cholesterol_risk || 'N/A'}</p>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-md">
                      <h4 className="font-medium text-slate-700 text-sm">High Glucose Risk</h4>
                      <p className="text-lg font-semibold text-slate-900">{healthVitals.high_fasting_glucose_risk || 'N/A'}</p>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-md">
                      <h4 className="font-medium text-slate-700 text-sm">Hypertension Risk</h4>
                      <p className="text-lg font-semibold text-slate-900">{healthVitals.hypertension_risk || 'N/A'}</p>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-md">
                      <h4 className="font-medium text-slate-700 text-sm">Diabetic Risk</h4>
                      <p className="text-lg font-semibold text-slate-900">{healthVitals.diabetic_risk || 'N/A'}</p>
                    </div>
                    
                    {/* License Key (if needed for display) */}
                    {healthVitals.license_key && (
                      <div className="bg-gray-50 p-3 rounded-md">
                        <h4 className="font-medium text-slate-700 text-sm">License Key</h4>
                        <p className="text-lg font-semibold text-slate-900">{healthVitals.license_key}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Monitoring Session Detection Status */}
              {true && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-slate-900 mb-4">Detection Status</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Alcohol Detection */}
                    <div className={`p-4 rounded-lg border-2 ${latestMonitoringSession.alcohol_detected === 1 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-slate-700">Alcohol</h4>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${latestMonitoringSession.alcohol_detected === 1 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          {latestMonitoringSession.alcohol_detected === 1 ? 'DETECTED' : 'NOT DETECTED'}
                        </span>
                      </div>
                      {latestMonitoringSession.alcohol_detected === 1 && latestMonitoringSession.alcohol_img_url && (
                        <div 
                          className="mt-2 relative group cursor-pointer"
                          onClick={() => setLightboxImage({
                            url: latestMonitoringSession.alcohol_img_url,
                            title: 'Alcohol Detection',
                            description: `Detected at ${format(new Date(), 'MMM dd, yyyy HH:mm')}`
                          })}
                        >
                          <img 
                            src={latestMonitoringSession.alcohol_img_url} 
                            alt="Alcohol detection"
                            className="w-full h-24 object-cover rounded border group-hover:opacity-90 transition-opacity"
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded">
                            <Maximize2 className="h-6 w-6 text-white" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Smoking Detection */}
                    <div className={`p-4 rounded-lg border-2 ${latestMonitoringSession.smoking_detected === 1 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-slate-700">Smoking</h4>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${latestMonitoringSession.smoking_detected === 1 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          {latestMonitoringSession.smoking_detected === 1 ? 'DETECTED' : 'NOT DETECTED'}
                        </span>
                      </div>
                      {latestMonitoringSession.smoking_detected === 1 && latestMonitoringSession.smoking_img_url && (
                        <div 
                          className="mt-2 relative group cursor-pointer"
                          onClick={() => setLightboxImage({
                            url: latestMonitoringSession.smoking_img_url,
                            title: 'Smoking Detection',
                            description: `Detected at ${format(new Date(), 'MMM dd, yyyy HH:mm')}`
                          })}
                        >
                          <img 
                            src={latestMonitoringSession.smoking_img_url} 
                            alt="Smoking detection"
                            className="w-full h-24 object-cover rounded border group-hover:opacity-90 transition-opacity"
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded">
                            <Maximize2 className="h-6 w-6 text-white" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Drowsy Detection */}
                    <div className={`p-4 rounded-lg border-2 ${latestMonitoringSession.drowsy_detected === 1 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-slate-700">Drowsiness</h4>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${latestMonitoringSession.drowsy_detected === 1 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          {latestMonitoringSession.drowsy_detected === 1 ? 'DETECTED' : 'NOT DETECTED'}
                        </span>
                      </div>
                      {latestMonitoringSession.drowsy_detected === 1 && latestMonitoringSession.drowsy_img_url && (
                        <div 
                          className="mt-2 relative group cursor-pointer"
                          onClick={() => setLightboxImage({
                            url: latestMonitoringSession.drowsy_img_url,
                            title: 'Drowsiness Detection',
                            description: `Detected at ${format(new Date(), 'MMM dd, yyyy HH:mm')}`
                          })}
                        >
                          <img 
                            src={latestMonitoringSession.drowsy_img_url} 
                            alt="Drowsiness detection"
                            className="w-full h-24 object-cover rounded border group-hover:opacity-90 transition-opacity"
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded">
                            <Maximize2 className="h-6 w-6 text-white" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Sleeping Detection */}
                    <div className={`p-4 rounded-lg border-2 ${latestMonitoringSession.sleeping_detected === 1 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-slate-700">Sleeping</h4>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${latestMonitoringSession.sleeping_detected === 1 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          {latestMonitoringSession.sleeping_detected === 1 ? 'DETECTED' : 'NOT DETECTED'}
                        </span>
                      </div>
                      {latestMonitoringSession.sleeping_detected === 1 && latestMonitoringSession.sleeping_img_url && (
                        <div 
                          className="mt-2 relative group cursor-pointer"
                          onClick={() => setLightboxImage({
                            url: latestMonitoringSession.sleeping_img_url,
                            title: 'Sleeping Detection',
                            description: `Detected at ${format(new Date(), 'MMM dd, yyyy HH:mm')}`
                          })}
                        >
                          <img 
                            src={latestMonitoringSession.sleeping_img_url} 
                            alt="Sleeping detection"
                            className="w-full h-24 object-cover rounded border group-hover:opacity-90 transition-opacity"
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded">
                            <Maximize2 className="h-6 w-6 text-white" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Mobile Use Detection */}
                    <div className={`p-4 rounded-lg border-2 ${latestMonitoringSession.mobile_use_detected === 1 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-slate-700">Mobile Use</h4>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${latestMonitoringSession.mobile_use_detected === 1 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          {latestMonitoringSession.mobile_use_detected === 1 ? 'DETECTED' : 'NOT DETECTED'}
                        </span>
                      </div>
                      {latestMonitoringSession.mobile_use_detected === 1 && latestMonitoringSession.mobile_use_img_url && (
                        <div 
                          className="mt-2 relative group cursor-pointer"
                          onClick={() => setLightboxImage({
                            url: latestMonitoringSession.mobile_use_img_url,
                            title: 'Mobile Use Detection',
                            description: `Detected at ${format(new Date(), 'MMM dd, yyyy HH:mm')}`
                          })}
                        >
                          <img 
                            src={latestMonitoringSession.mobile_use_img_url} 
                            alt="Mobile use detection"
                            className="w-full h-24 object-cover rounded border group-hover:opacity-90 transition-opacity"
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded">
                            <Maximize2 className="h-6 w-6 text-white" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Distraction Detection */}
                    <div className={`p-4 rounded-lg border-2 ${latestMonitoringSession.distracted_detected === 1 ? 'border-yellow-200 bg-yellow-50' : 'border-green-200 bg-green-50'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-slate-700">Distraction</h4>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${latestMonitoringSession.distracted_detected === 1 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                          {latestMonitoringSession.distracted_detected === 1 ? 'DETECTED' : 'NOT DETECTED'}
                        </span>
                      </div>
                      {latestMonitoringSession.distracted_detected === 1 && latestMonitoringSession.distracted_img_url && (
                        <div 
                          className="mt-2 relative group cursor-pointer"
                          onClick={() => setLightboxImage({
                            url: latestMonitoringSession.distracted_img_url,
                            title: 'Distraction Detection',
                            description: `Detected at ${format(new Date(), 'MMM dd, yyyy HH:mm')}`
                          })}
                        >
                          <img 
                            src={latestMonitoringSession.distracted_img_url} 
                            alt="Distraction detection"
                            className="w-full h-24 object-cover rounded border group-hover:opacity-90 transition-opacity"
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded">
                            <Maximize2 className="h-6 w-6 text-white" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Drinking Detection */}
                    <div className={`p-4 rounded-lg border-2 ${latestMonitoringSession.drinking_detected === 1 ? 'border-yellow-200 bg-yellow-50' : 'border-green-200 bg-green-50'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-slate-700">Drinking</h4>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${latestMonitoringSession.drinking_detected === 1 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                          {latestMonitoringSession.drinking_detected === 1 ? 'DETECTED' : 'NOT DETECTED'}
                        </span>
                      </div>
                      {latestMonitoringSession.drinking_detected === 1 && latestMonitoringSession.drinking_img_url && (
                        <div 
                          className="mt-2 relative group cursor-pointer"
                          onClick={() => setLightboxImage({
                            url: latestMonitoringSession.drinking_img_url,
                            title: 'Drinking Detection',
                            description: `Detected at ${format(new Date(), 'MMM dd, yyyy HH:mm')}`
                          })}
                        >
                          <img 
                            src={latestMonitoringSession.drinking_img_url} 
                            alt="Drinking detection"
                            className="w-full h-24 object-cover rounded border group-hover:opacity-90 transition-opacity"
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded">
                            <Maximize2 className="h-6 w-6 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Detection Images */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Alcohol Detections */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-slate-900 mb-4 flex items-center space-x-2">
                    <Camera className="h-5 w-5" />
                    <span>Recent Alcohol Detections</span>
                  </h3>
                  {alcoholDetections.length > 0 ? (
                    <div className="space-y-4">
                      {alcoholDetections.slice(0, 3).map((detection) => (
                        <div key={detection.id} className="border border-gray-200 rounded-md p-3">
                          <div className="flex justify-between items-start mb-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              detection.severity === 'HIGH' || detection.severity === 'CRITICAL' 
                                ? 'bg-red-100 text-red-800' 
                                : detection.severity === 'MEDIUM'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {detection.severity} Risk
                            </span>
                            <div className="flex items-center space-x-1 text-xs text-slate-500">
                              <Clock className="h-3 w-3" />
                              <span>{format(new Date(detection.detectedAt), 'MMM dd, HH:mm')}</span>
                            </div>
                          </div>
                          <p className="text-sm text-slate-600">
                            Confidence: {(detection.confidence * 100).toFixed(1)}%
                          </p>
                          {detection.location && (
                            <p className="text-sm text-slate-500">Location: {detection.location}</p>
                          )}
                          {detection.imageUrl && (
                            <div 
                              className="mt-2 relative group cursor-pointer"
                              onClick={() => setLightboxImage({
                                url: detection.imageUrl,
                                title: 'Alcohol Detection',
                                description: `${detection.severity} Risk - Confidence: ${(detection.confidence * 100).toFixed(1)}%`
                              })}
                            >
                              <img 
                                src={detection.imageUrl} 
                                alt="Alcohol detection"
                                className="w-full h-32 object-cover rounded border group-hover:opacity-90 transition-opacity"
                              />
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded">
                                <Maximize2 className="h-6 w-6 text-white" />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm">No recent alcohol detections</p>
                  )}
                </div>

                {/* Object Detections */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-slate-900 mb-4 flex items-center space-x-2">
                    <Camera className="h-5 w-5" />
                    <span>Recent Object Detections</span>
                  </h3>
                  {objectDetections.length > 0 ? (
                    <div className="space-y-4">
                      {objectDetections.slice(0, 3).map((detection) => (
                        <div key={detection.id} className="border border-gray-200 rounded-md p-3">
                          <div className="flex justify-between items-start mb-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              detection.severity === 'HIGH' || detection.severity === 'CRITICAL' 
                                ? 'bg-red-100 text-red-800' 
                                : detection.severity === 'MEDIUM'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {detection.objectType}
                            </span>
                            <div className="flex items-center space-x-1 text-xs text-slate-500">
                              <Clock className="h-3 w-3" />
                              <span>{format(new Date(detection.detectedAt), 'MMM dd, HH:mm')}</span>
                            </div>
                          </div>
                          <p className="text-sm text-slate-600">
                            Confidence: {(detection.confidence * 100).toFixed(1)}%
                          </p>
                          {detection.location && (
                            <p className="text-sm text-slate-500">Location: {detection.location}</p>
                          )}
                          {detection.imageUrl && (
                            <div 
                              className="mt-2 relative group cursor-pointer"
                              onClick={() => setLightboxImage({
                                url: detection.imageUrl,
                                title: `${detection.objectType} Detection`,
                                description: `${detection.severity || 'Unknown'} Severity - Confidence: ${(detection.confidence * 100).toFixed(1)}%`
                              })}
                            >
                              <img 
                                src={detection.imageUrl} 
                                alt={`${detection.objectType} detection`}
                                className="w-full h-32 object-cover rounded border group-hover:opacity-90 transition-opacity"
                              />
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded">
                                <Maximize2 className="h-6 w-6 text-white" />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm">No recent object detections</p>
                  )}
                </div>
              </div>

              {/* Recommendations */}
              {recommendations.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-blue-900 mb-4">Health Recommendations</h3>
                  <ul className="space-y-2">
                    {recommendations.map((recommendation, index) => (
                      <li key={index} className="flex items-start space-x-2 text-blue-800">
                        <span className="text-blue-600 mt-1">•</span>
                        <span className="text-sm">{recommendation}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Notes */}
              {latestReport?.notes && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-slate-900 mb-3">Medical Notes</h3>
                  <p className="text-slate-700 text-sm leading-relaxed">{latestReport.notes}</p>
                </div>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>

    {/* Image Lightbox */}
    {lightboxImage && (
      <ImageLightbox
        isOpen={!!lightboxImage}
        onClose={() => setLightboxImage(null)}
        imageUrl={lightboxImage.url}
        title={lightboxImage.title}
        description={lightboxImage.description}
      />
    )}
    </>
  );
}
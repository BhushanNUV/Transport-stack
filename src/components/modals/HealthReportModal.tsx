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
  Minus
} from 'lucide-react';
import { HealthReportWithDetails, AlcoholDetection, ObjectDetection } from '@/types';

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
        healthVitals: {
          // Basic driver info from database
          ...(healthVitalsData.data || {}),
          // Calculate BMI if height and weight are available
          bmi: healthVitalsData.data?.weight && healthVitalsData.data?.height 
            ? (healthVitalsData.data.weight / Math.pow(healthVitalsData.data.height / 100, 2)).toFixed(1)
            : null,
          // Comprehensive mock health vitals for demonstration (until real data is available)
          heart_age: driverData.data.age ? `${driverData.data.age + 2} years` : '27 years',
          ascvd_risk: 'Low (5%)',
          blood_pressure: '120/80 mmHg',
          heart_rate: '72 BPM',
          breathing_rate: '16 breaths/min',
          prq: '85 ms',
          oxygen_saturation: '98%',
          stress_level: 'Normal',
          recovery_ability: 'Good',
          stress_response: 'Stable',
          respiration: '14-18 cycles/min',
          hrv_sdnn: '45 ms',
          hemoglobin: '14.5 g/dL',
          hba1c: '5.4%',
          // Risk assessments
          low_hemoglobin_risk: 'Low',
          high_total_cholesterol_risk: 'Low',
          high_fasting_glucose_risk: 'Low',
          hypertension_risk: 'Low',
          diabetic_risk: 'Low',
          // Confidence levels
          heart_rate_conf_level: '95%',
          breathing_rate_conf_level: '92%',
          prq_conf_level: '88%',
          hrv_sdnn_conf_level: '90%'
        }, // Combined real and mock health vitals data
        latestReport: driverData.data.healthReports?.[0] || null,
        alcoholDetections: driverData.data.alcoholDetections || [],
        objectDetections: driverData.data.objectDetections || [],
        latestMonitoringSession: driverData.data.latestMonitoringSession || {
          alcohol_detected: 0,
          smoking_detected: 0,
          drowsy_detected: 0,
          sleeping_detected: 0,
          mobile_use_detected: 0,
          eating_detected: 0,
          drinking_detected: 0,
          alcohol_img_url: null,
          smoking_img_url: null,
          drowsy_img_url: null,
          sleeping_img_url: null,
          mobile_use_img_url: null,
          eating_img_url: null,
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
    window.print();
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
                        <div className="mt-2">
                          <img 
                            src={latestMonitoringSession.alcohol_img_url} 
                            alt="Alcohol detection"
                            className="w-full h-24 object-cover rounded border"
                          />
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
                        <div className="mt-2">
                          <img 
                            src={latestMonitoringSession.smoking_img_url} 
                            alt="Smoking detection"
                            className="w-full h-24 object-cover rounded border"
                          />
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
                        <div className="mt-2">
                          <img 
                            src={latestMonitoringSession.drowsy_img_url} 
                            alt="Drowsiness detection"
                            className="w-full h-24 object-cover rounded border"
                          />
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
                        <div className="mt-2">
                          <img 
                            src={latestMonitoringSession.sleeping_img_url} 
                            alt="Sleeping detection"
                            className="w-full h-24 object-cover rounded border"
                          />
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
                        <div className="mt-2">
                          <img 
                            src={latestMonitoringSession.mobile_use_img_url} 
                            alt="Mobile use detection"
                            className="w-full h-24 object-cover rounded border"
                          />
                        </div>
                      )}
                    </div>

                    {/* Eating Detection */}
                    <div className={`p-4 rounded-lg border-2 ${latestMonitoringSession.eating_detected === 1 ? 'border-yellow-200 bg-yellow-50' : 'border-green-200 bg-green-50'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-slate-700">Eating</h4>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${latestMonitoringSession.eating_detected === 1 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                          {latestMonitoringSession.eating_detected === 1 ? 'DETECTED' : 'NOT DETECTED'}
                        </span>
                      </div>
                      {latestMonitoringSession.eating_detected === 1 && latestMonitoringSession.eating_img_url && (
                        <div className="mt-2">
                          <img 
                            src={latestMonitoringSession.eating_img_url} 
                            alt="Eating detection"
                            className="w-full h-24 object-cover rounded border"
                          />
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
                        <div className="mt-2">
                          <img 
                            src={latestMonitoringSession.drinking_img_url} 
                            alt="Drinking detection"
                            className="w-full h-24 object-cover rounded border"
                          />
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
                            <div className="mt-2">
                              <img 
                                src={detection.imageUrl} 
                                alt="Alcohol detection"
                                className="w-full h-32 object-cover rounded border"
                              />
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
                            <div className="mt-2">
                              <img 
                                src={detection.imageUrl} 
                                alt={`${detection.objectType} detection`}
                                className="w-full h-32 object-cover rounded border"
                              />
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
  );
}
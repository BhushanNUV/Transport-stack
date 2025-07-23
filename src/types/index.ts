// Prisma generated types
export type {
  Driver,
  HealthReport,
  AttendanceRecord,
  AlcoholDetection,
  ObjectDetection,
  SystemAlert,
  User,
  Gender,
  StressLevel,
  RiskLevel,
  AttendanceStatus,
  DetectionSeverity,
  AlertType,
  AlertSeverity,
  UserRole,
} from '@prisma/client';

// Import types for internal use
import type { 
  Driver, 
  HealthReport, 
  Gender, 
  RiskLevel, 
  AttendanceStatus,
  AttendanceRecord,
  AlcoholDetection,
  ObjectDetection
} from '@prisma/client';

// Extended types for API responses
export interface DriverWithRelations extends Driver {
  healthReports: HealthReport[];
  attendanceRecords: AttendanceRecord[];
  alcoholDetections: AlcoholDetection[];
  objectDetections: ObjectDetection[];
  profilePhotoUrl?: string | null;
  todayAttendance?: {
    status: string;
    checkInTime: Date | null;
    checkOutTime: Date | null;
    totalSessions: number;
    workingHours: string | null;
  };
  latestMonitoringSession?: {
    alcohol_detected: number;
    smoking_detected: number;
    drowsy_detected: number;
    sleeping_detected: number;
    mobile_use_detected: number;
    distracted_detected: number;
    drinking_detected: number;
    alcohol_img_url: string | null;
    smoking_img_url: string | null;
    drowsy_img_url: string | null;
    sleeping_img_url: string | null;
    mobile_use_img_url: string | null;
    distracted_img_url: string | null;
    drinking_img_url: string | null;
  };
}

export interface HealthReportWithDetails extends HealthReport {
  driver: Driver;
  alcoholDetections?: AlcoholDetection[];
  objectDetections?: ObjectDetection[];
  // Additional health vitals fields from the API response
  heart_rate?: string | null;
  breathing_rate?: string | null;
  oxygen_saturation?: string | null;
  blood_pressure?: string | null;
  stress_level?: string | null;
  recovery_ability?: string | null;
  hemoglobin?: string | null;
  hba1c?: string | null;
  hypertension_risk?: string | null;
  diabetic_risk?: string | null;
  heart_rate_conf_level?: string | null;
  breathing_rate_conf_level?: string | null;
  prq_conf_level?: string | null;
  hrv_sdnn_conf_level?: string | null;
}

// Component props interfaces
export interface HealthReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  driverId: string;
}

export interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Form types
export interface CreateDriverData {
  name: string;
  phone: string;
  age: number;
  gender: Gender;
  address?: string | null;
  profilePhoto?: string | null;
  dateOfBirth?: Date | null;
  weight?: number | null;
  height?: number | null;
}

export interface UpdateDriverData extends Partial<CreateDriverData> {
  id: string;
}

// Filter types
export interface DriversFilter {
  gender?: Gender;
  ageRange?: {
    min: number;
    max: number;
  };
  dateRange?: {
    start: Date;
    end: Date;
  };
  riskLevel?: RiskLevel;
  search?: string;
}

export interface AttendanceFilter {
  dateRange?: {
    start: Date;
    end: Date;
  };
  status?: AttendanceStatus;
  driverId?: string;
  search?: string;
}

// Notification types
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: Date;
  read: boolean;
  driverId?: string;
  actionUrl?: string;
}

export interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  removeNotification: (id: string) => void;
}
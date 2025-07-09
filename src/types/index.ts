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
    eating_detected: number;
    drinking_detected: number;
    alcohol_img_url: string | null;
    smoking_img_url: string | null;
    drowsy_img_url: string | null;
    sleeping_img_url: string | null;
    mobile_use_img_url: string | null;
    eating_img_url: string | null;
    drinking_img_url: string | null;
  };
}

export interface HealthReportWithDetails extends HealthReport {
  driver: Driver;
  alcoholDetections?: AlcoholDetection[];
  objectDetections?: ObjectDetection[];
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
  email: string;
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
}
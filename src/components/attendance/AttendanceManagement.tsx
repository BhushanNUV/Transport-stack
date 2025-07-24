'use client';

import { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, addDays, subDays, isToday, parseISO } from 'date-fns';
import {
  Calendar,
  Clock,
  Users,
  Download,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
  MapPin,
  Timer,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { AttendanceRecord, Driver, AttendanceStatus, AttendanceFilter } from '@/types';
import { exportToExcel, ExcelColumn } from '@/utils/excelExport';
import Pagination from '@/components/common/Pagination';
import ItemsPerPageSelector from '@/components/common/ItemsPerPageSelector';

interface AttendanceWithDriver extends AttendanceRecord {
  driver: Driver;
  sessionCount?: number;
}

interface AttendanceStats {
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  averageWorkingHours: number;
  attendanceRate: number;
}

// Mock data for demonstration
const getMockAttendanceData = (): AttendanceWithDriver[] => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  return [
    {
      id: '1',
      driverId: 'drv1',
      date: today,
      checkInTime: new Date(Date.now() - 8 * 60 * 60 * 1000),
      checkOutTime: new Date(),
      workingHours: 8.5,
      status: 'PRESENT',
      location: 'Main Office',
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      driver: {
        id: 'drv1',
        driverId: 'DRV-001',
        name: 'John Smith',
        email: 'john@example.com',
        phone: '+1234567890',
        age: 35,
        gender: 'MALE',
        address: '123 Main St',
        profilePhoto: null,
        dateOfBirth: new Date('1988-05-15'),
        weight: 75.5,
        height: 180,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Driver,
    },
    {
      id: '2',
      driverId: 'drv2',
      date: today,
      checkInTime: new Date(Date.now() - 7 * 60 * 60 * 1000),
      checkOutTime: null,
      workingHours: null,
      status: 'PRESENT',
      location: 'Warehouse',
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      driver: {
        id: 'drv2',
        driverId: 'DRV-002',
        name: 'Sarah Johnson',
        email: 'sarah@example.com',
        phone: '+1234567891',
        age: 28,
        gender: 'FEMALE',
        address: '456 Oak Ave',
        profilePhoto: null,
        dateOfBirth: new Date('1995-08-22'),
        weight: 65.0,
        height: 165,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Driver,
    },
    {
      id: '3',
      driverId: 'drv3',
      date: yesterday,
      checkInTime: new Date(yesterday.getTime() + 9 * 60 * 60 * 1000 + 15 * 60 * 1000),
      checkOutTime: new Date(yesterday.getTime() + 17 * 60 * 60 * 1000 + 30 * 60 * 1000),
      workingHours: 8.25,
      status: 'LATE',
      location: 'Main Office',
      notes: 'Traffic delay',
      createdAt: new Date(),
      updatedAt: new Date(),
      driver: {
        id: 'drv3',
        driverId: 'DRV-003',
        name: 'Michael Chen',
        email: 'michael@example.com',
        phone: '+1234567892',
        age: 42,
        gender: 'MALE',
        address: '789 Pine St',
        profilePhoto: null,
        dateOfBirth: new Date('1981-12-03'),
        weight: 80.0,
        height: 175,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Driver,
    },
    {
      id: '4',
      driverId: 'drv4',
      date: yesterday,
      checkInTime: null,
      checkOutTime: null,
      workingHours: null,
      status: 'ABSENT',
      location: null,
      notes: 'Sick leave',
      createdAt: new Date(),
      updatedAt: new Date(),
      driver: {
        id: 'drv4',
        driverId: 'DRV-004',
        name: 'Emily Davis',
        email: 'emily@example.com',
        phone: '+1234567893',
        age: 31,
        gender: 'FEMALE',
        address: '321 Elm St',
        profilePhoto: null,
        dateOfBirth: new Date('1992-04-18'),
        weight: 58.5,
        height: 160,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Driver,
    },
    {
      id: '5',
      driverId: 'drv5',
      date: twoDaysAgo,
      checkInTime: new Date(twoDaysAgo.getTime() + 8 * 60 * 60 * 1000),
      checkOutTime: new Date(twoDaysAgo.getTime() + 13 * 60 * 60 * 1000),
      workingHours: 5.0,
      status: 'HALF_DAY',
      location: 'Remote',
      notes: 'Medical appointment',
      createdAt: new Date(),
      updatedAt: new Date(),
      driver: {
        id: 'drv5',
        driverId: 'DRV-005',
        name: 'Robert Wilson',
        email: 'robert@example.com',
        phone: '+1234567894',
        age: 38,
        gender: 'MALE',
        address: '654 Maple Dr',
        profilePhoto: null,
        dateOfBirth: new Date('1985-09-12'),
        weight: 85.5,
        height: 182,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Driver,
    },
    {
      id: '6',
      driverId: 'drv6',
      date: twoDaysAgo,
      checkInTime: new Date(twoDaysAgo.getTime() + 8 * 60 * 60 * 1000),
      checkOutTime: new Date(twoDaysAgo.getTime() + 15 * 60 * 60 * 1000),
      workingHours: 7.0,
      status: 'EARLY_LEAVE',
      location: 'Main Office',
      notes: 'Personal emergency',
      createdAt: new Date(),
      updatedAt: new Date(),
      driver: {
        id: 'drv6',
        driverId: 'DRV-006',
        name: 'Lisa Anderson',
        email: 'lisa@example.com',
        phone: '+1234567895',
        age: 29,
        gender: 'FEMALE',
        address: '987 Cedar Ln',
        profilePhoto: null,
        dateOfBirth: new Date('1994-06-30'),
        weight: 62.0,
        height: 168,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Driver,
    },
  ];
};

export default function AttendanceManagement() {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceWithDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [stats, setStats] = useState<AttendanceStats>({
    totalPresent: 0,
    totalAbsent: 0,
    totalLate: 0,
    averageWorkingHours: 0,
    attendanceRate: 0,
  });

  // Filters
  const [filters, setFilters] = useState<AttendanceFilter>({
    status: undefined,
    driverId: undefined,
    search: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5); // Reduced to 5 to show pagination with fewer records

  useEffect(() => {
    fetchAttendanceData();
  }, [selectedDate, viewMode, filters]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedRecords = [...attendanceRecords].sort((a, b) => {
    if (!sortField) return 0;

    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case 'driverName':
        aValue = a.driver.name;
        bValue = b.driver.name;
        break;
      case 'date':
        aValue = new Date(a.date).getTime();
        bValue = new Date(b.date).getTime();
        break;
      case 'status':
        const statusOrder = { PRESENT: 1, LATE: 2, ABSENT: 3 };
        aValue = statusOrder[a.status] || 4;
        bValue = statusOrder[b.status] || 4;
        break;
      case 'sessionCount':
        aValue = a.sessionCount || 0;
        bValue = b.sessionCount || 0;
        break;
      default:
        return 0;
    }

    // Handle null/undefined values
    if (aValue == null) return 1;
    if (bValue == null) return -1;

    // Sort logic
    if (typeof aValue === 'string') {
      return sortOrder === 'asc' 
        ? aValue.localeCompare(bValue) 
        : bValue.localeCompare(aValue);
    }

    if (typeof aValue === 'number') {
      return sortOrder === 'asc' 
        ? aValue - bValue 
        : bValue - aValue;
    }

    return 0;
  });
  
  // Calculate pagination
  const totalRecords = sortedRecords.length;
  const totalPages = Math.ceil(totalRecords / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRecords = sortedRecords.slice(startIndex, endIndex);
  
  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, selectedDate, viewMode]);
  
  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const fetchAttendanceData = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      
      // Set date range based on view mode
      let startDate: Date, endDate: Date;
      
      if (viewMode === 'daily') {
        startDate = new Date(selectedDate);
        endDate = new Date(selectedDate);
      } else if (viewMode === 'weekly') {
        startDate = startOfWeek(selectedDate, { weekStartsOn: 1 });
        endDate = endOfWeek(selectedDate, { weekStartsOn: 1 });
      } else {
        startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
      }
      
      params.append('startDate', startDate.toISOString());
      params.append('endDate', endDate.toISOString());
      
      // Request all records for client-side pagination
      params.append('limit', '1000'); // Get up to 1000 records
      params.append('page', '1');
      
      if (filters.status) params.append('status', filters.status);
      if (filters.driverId) params.append('driverId', filters.driverId);
      if (filters.search) params.append('search', filters.search);

      const response = await fetch(`/api/attendance?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch attendance data');
      }

      const result = await response.json();
      setAttendanceRecords(result.data || []);
      calculateStats(result.data || []);
    } catch (err) {
      console.error('Attendance API error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setAttendanceRecords([]);
      setStats({
        totalPresent: 0,
        totalAbsent: 0,
        totalLate: 0,
        averageWorkingHours: 0,
        attendanceRate: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (records: AttendanceWithDriver[]) => {
    const totalRecords = records.length;
    if (totalRecords === 0) {
      setStats({
        totalPresent: 0,
        totalAbsent: 0,
        totalLate: 0,
        averageWorkingHours: 0,
        attendanceRate: 0,
      });
      return;
    }

    const present = records.filter(r => r.status === 'PRESENT').length;
    const absent = records.filter(r => r.status === 'ABSENT').length;
    const late = records.filter(r => r.status === 'LATE').length;
    
    const workingHoursRecords = records.filter(r => r.workingHours && r.workingHours > 0);
    const averageWorkingHours = workingHoursRecords.length > 0
      ? workingHoursRecords.reduce((sum, r) => sum + (r.workingHours || 0), 0) / workingHoursRecords.length
      : 0;
    
    const attendanceRate = totalRecords > 0 ? (present / totalRecords) * 100 : 0;

    setStats({
      totalPresent: present,
      totalAbsent: absent,
      totalLate: late,
      averageWorkingHours,
      attendanceRate,
    });
  };


  const getStatusIcon = (status: AttendanceStatus) => {
    switch (status) {
      case 'PRESENT':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'ABSENT':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'LATE':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'EARLY_LEAVE':
        return <Clock className="h-5 w-5 text-orange-600" />;
      case 'HALF_DAY':
        return <Timer className="h-5 w-5 text-blue-600" />;
      default:
        return <Minus className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case 'PRESENT':
        return 'bg-green-100 text-green-800';
      case 'ABSENT':
        return 'bg-red-100 text-red-800';
      case 'LATE':
        return 'bg-yellow-100 text-yellow-800';
      case 'EARLY_LEAVE':
        return 'bg-orange-100 text-orange-800';
      case 'HALF_DAY':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatWorkingHours = (hours: number | null) => {
    if (!hours) return 'N/A';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };


  const navigateDate = (direction: 'prev' | 'next') => {
    if (viewMode === 'daily') {
      setSelectedDate(direction === 'next' ? addDays(selectedDate, 1) : subDays(selectedDate, 1));
    } else if (viewMode === 'weekly') {
      setSelectedDate(direction === 'next' ? addDays(selectedDate, 7) : subDays(selectedDate, 7));
    } else {
      const newDate = new Date(selectedDate);
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
      setSelectedDate(newDate);
    }
  };

  const handleExport = () => {
    try {
      // Define columns for Excel export
      const columns: ExcelColumn[] = [
        { header: 'Driver ID', key: 'driver.driverId', width: 15, type: 'string' },
        { header: 'Driver Name', key: 'driver.name', width: 20 },
        { header: 'Phone', key: 'driver.phone', width: 18, type: 'string' },
        { header: 'Date', key: 'date', width: 15, type: 'date' },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Check In Time', key: 'checkInTime', width: 20, type: 'date' },
        { header: 'Check Out Time', key: 'checkOutTime', width: 20, type: 'date' },
        { header: 'Working Hours', key: 'workingHours', width: 15, type: 'string' },
        { header: 'Scan Count', key: 'sessionCount', width: 12, type: 'number' },
        { header: 'Location', key: 'location', width: 20 },
        { header: 'Notes', key: 'notes', width: 30 },
      ];

      // Format data for export
      const exportData = sortedRecords.map(record => ({
        ...record,
        status: record.status.replace('_', ' '),
        workingHours: record.workingHours ? formatWorkingHours(record.workingHours) : 'N/A',
        sessionCount: record.sessionCount || 0,
      }));

      // Generate filename based on view mode and date
      let filename = 'attendance_report';
      if (viewMode === 'daily') {
        filename += `_${format(selectedDate, 'yyyy-MM-dd')}`;
      } else if (viewMode === 'weekly') {
        filename += `_week_${format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')}`;
      } else {
        filename += `_${format(selectedDate, 'yyyy-MM')}`;
      }

      exportToExcel({
        filename,
        sheetName: 'Attendance',
        columns,
        data: exportData,
      });
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data. Please try again.');
    }
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Calendar className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Attendance Management</h1>
            <p className="text-gray-600">Track driver attendance based on monitoring session data</p>
            <p className="text-sm text-blue-600 mt-1">Attendance determined by first daily monitoring session entry</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleExport}
            className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Present</p>
              <p className="text-2xl font-bold text-green-600">{stats.totalPresent}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Absent</p>
              <p className="text-2xl font-bold text-red-600">{stats.totalAbsent}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Attendance Rate</p>
              <p className="text-2xl font-bold text-purple-600">{stats.attendanceRate.toFixed(1)}%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          {/* Date Navigation */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigateDate('prev')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center space-x-2">
              <div className="text-lg font-semibold text-gray-900">
                {viewMode === 'daily' && format(selectedDate, 'MMMM d, yyyy')}
                {viewMode === 'weekly' && `${format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'MMM d')} - ${format(endOfWeek(selectedDate, { weekStartsOn: 1 }), 'MMM d, yyyy')}`}
                {viewMode === 'monthly' && format(selectedDate, 'MMMM yyyy')}
              </div>
              <button
                onClick={() => {
                  const input = document.getElementById('date-picker') as HTMLInputElement;
                  input?.showPicker();
                }}
                className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                title="Choose date"
              >
                <Calendar className="h-4 w-4" />
              </button>
              <input
                id="date-picker"
                type="date"
                value={format(selectedDate, 'yyyy-MM-dd')}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDate(new Date(e.target.value));
                  }
                }}
                className="sr-only"
              />
            </div>
            <button
              onClick={() => navigateDate('next')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <button
              onClick={() => setSelectedDate(new Date())}
              className="ml-2 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md"
            >
              Today
            </button>
          </div>

          {/* View Mode Selector */}
          <div className="flex items-center space-x-2">
            {(['daily', 'weekly', 'monthly'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  viewMode === mode
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center space-x-4">
          <div className="flex-1 ">
            <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search drivers..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status || ''}
                onChange={(e) => setFilters({ ...filters, status: e.target.value as AttendanceStatus || undefined })}
                className="w-full p-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Statuses</option>
                <option value="PRESENT">Present</option>
                <option value="ABSENT">Absent</option>
                <option value="LATE">Late</option>
                <option value="EARLY_LEAVE">Early Leave</option>
                <option value="HALF_DAY">Half Day</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            {loading ? (
              <span>Loading...</span>
            ) : (
              <span>{totalRecords} record{totalRecords !== 1 ? 's' : ''} found</span>
            )}
          </div>
          <ItemsPerPageSelector
            value={itemsPerPage}
            onChange={handleItemsPerPageChange}
            options={[5, 10, 20, 30, 50]}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('driverName')}
                    className="flex items-center space-x-1 hover:text-gray-700"
                  >
                    <span>Driver</span>
                    <div className="flex flex-col">
                      <ChevronUp 
                        className={`h-3 w-3 -mb-1 ${
                          sortField === 'driverName' && sortOrder === 'asc' 
                            ? 'text-blue-600' 
                            : 'text-gray-400'
                        }`} 
                      />
                      <ChevronDown 
                        className={`h-3 w-3 -mt-1 ${
                          sortField === 'driverName' && sortOrder === 'desc' 
                            ? 'text-blue-600' 
                            : 'text-gray-400'
                        }`} 
                      />
                    </div>
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('date')}
                    className="flex items-center space-x-1 hover:text-gray-700"
                  >
                    <span>Date</span>
                    <div className="flex flex-col">
                      <ChevronUp 
                        className={`h-3 w-3 -mb-1 ${
                          sortField === 'date' && sortOrder === 'asc' 
                            ? 'text-blue-600' 
                            : 'text-gray-400'
                        }`} 
                      />
                      <ChevronDown 
                        className={`h-3 w-3 -mt-1 ${
                          sortField === 'date' && sortOrder === 'desc' 
                            ? 'text-blue-600' 
                            : 'text-gray-400'
                        }`} 
                      />
                    </div>
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('status')}
                    className="flex items-center space-x-1 hover:text-gray-700"
                  >
                    <span>Status</span>
                    <div className="flex flex-col">
                      <ChevronUp 
                        className={`h-3 w-3 -mb-1 ${
                          sortField === 'status' && sortOrder === 'asc' 
                            ? 'text-blue-600' 
                            : 'text-gray-400'
                        }`} 
                      />
                      <ChevronDown 
                        className={`h-3 w-3 -mt-1 ${
                          sortField === 'status' && sortOrder === 'desc' 
                            ? 'text-blue-600' 
                            : 'text-gray-400'
                        }`} 
                      />
                    </div>
                  </button>
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('sessionCount')}
                    className="flex items-center justify-center space-x-1 hover:text-gray-700 w-full"
                  >
                    <span>Scan Count</span>
                    <div className="flex flex-col">
                      <ChevronUp 
                        className={`h-3 w-3 -mb-1 ${
                          sortField === 'sessionCount' && sortOrder === 'asc' 
                            ? 'text-blue-600' 
                            : 'text-gray-400'
                        }`} 
                      />
                      <ChevronDown 
                        className={`h-3 w-3 -mt-1 ${
                          sortField === 'sessionCount' && sortOrder === 'desc' 
                            ? 'text-blue-600' 
                            : 'text-gray-400'
                        }`} 
                      />
                    </div>
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="animate-pulse flex items-center space-x-3">
                        <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                        <div className="space-y-2">
                          <div className="h-4 w-24 bg-gray-200 rounded"></div>
                          <div className="h-3 w-16 bg-gray-200 rounded"></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="animate-pulse h-4 w-20 bg-gray-200 rounded"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="animate-pulse h-6 w-16 bg-gray-200 rounded-full"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="animate-pulse h-4 w-8 bg-gray-200 rounded mx-auto"></div>
                    </td>
                  </tr>
                ))
              ) : paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    No attendance records found
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        {record.driver.profilePhoto ? (
                          <img
                            src={record.driver.profilePhoto.startsWith('http://') || record.driver.profilePhoto.startsWith('https://') 
                              ? record.driver.profilePhoto 
                              : `${process.env.NEXT_PUBLIC_FLASK_API_BASE_URL || 'http://localhost:5000'}/driver_images/${record.driver.profilePhoto}`}
                            alt={record.driver.name}
                            className="h-10 w-10 rounded-full object-cover border-2 border-gray-200"
                          />
                        ) : (
                          <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{record.driver.name}</div>
                          <div className="text-sm text-gray-500">{record.driver.driverId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {format(new Date(record.date), 'MMM dd, yyyy')}
                      </div>
                      {isToday(new Date(record.date)) && (
                        <div className="text-xs text-blue-600 font-medium">Today</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(record.status)}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                          {record.status.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center">
                        <span className={`text-sm font-medium ${
                          (record.sessionCount || 0) > 0 ? 'text-gray-900' : 'text-gray-400'
                        }`}>
                          {record.sessionCount || 0}
                        </span>
                        {(record.sessionCount || 0) > 5 && (
                          <TrendingUp className="h-4 w-4 text-green-500 ml-1" />
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalRecords}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
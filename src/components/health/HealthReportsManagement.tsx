'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Heart,
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Search,
  Filter,
  Download,
  Eye,
  Calendar,
  User,
  BarChart3,
  Clock,
  ChevronDown,
} from 'lucide-react';
import { HealthReportWithDetails, RiskLevel, StressLevel } from '@/types';
import HealthReportModal from '@/components/modals/HealthReportModal';

interface HealthStats {
  totalReports: number;
  criticalCases: number;
  averageRiskScore: number;
  trendsUp: boolean;
}

export default function HealthReportsManagement() {
  const [healthReports, setHealthReports] = useState<HealthReportWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReports, setTotalReports] = useState(0);
  const itemsPerPage = 15;

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    riskLevel: '',
    stressLevel: '',
    dateRange: '',
  });

  // Stats
  const [stats, setStats] = useState<HealthStats>({
    totalReports: 0,
    criticalCases: 0,
    averageRiskScore: 0,
    trendsUp: false,
  });

  useEffect(() => {
    fetchHealthReports();
  }, [currentPage, filters]);

  const fetchHealthReports = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      });

      if (filters.search) params.append('search', filters.search);
      if (filters.riskLevel) params.append('riskLevel', filters.riskLevel);
      if (filters.stressLevel) params.append('stressLevel', filters.stressLevel);
      if (filters.dateRange) params.append('dateRange', filters.dateRange);

      const response = await fetch(`/api/health-reports?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch health reports');
      }

      const result = await response.json();
      setHealthReports(result.data || []);
      setTotalPages(result.pagination?.totalPages || 1);
      setTotalReports(result.pagination?.total || 0);
      
      // Calculate stats
      calculateStats(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setHealthReports([]);
      setStats({
        totalReports: 0,
        criticalCases: 0,
        averageRiskScore: 0,
        trendsUp: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (reports: HealthReportWithDetails[]) => {
    const totalReports = reports.length;
    const criticalCases = reports.filter(r => r.riskLevel === 'CRITICAL' || r.riskLevel === 'HIGH').length;
    
    const riskScoreMap = { NORMAL: 1, LOW: 2, MEDIUM: 3, HIGH: 4, CRITICAL: 5 };
    const averageRiskScore = totalReports > 0 
      ? reports.reduce((sum, r) => sum + riskScoreMap[r.riskLevel], 0) / totalReports 
      : 0;

    setStats({
      totalReports,
      criticalCases,
      averageRiskScore,
      trendsUp: Math.random() > 0.5, // Mock trend
    });
  };

  const getRiskLevelColor = (level: RiskLevel) => {
    switch (level) {
      case 'NORMAL': return 'bg-green-100 text-green-800';
      case 'LOW': return 'bg-yellow-100 text-yellow-800';
      case 'MEDIUM': return 'bg-orange-100 text-orange-800';
      case 'HIGH': return 'bg-red-100 text-red-800';
      case 'CRITICAL': return 'bg-red-200 text-red-900';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStressLevelColor = (level: StressLevel | null) => {
    if (!level) return 'text-gray-500';
    switch (level) {
      case 'LOW': return 'text-green-600';
      case 'NORMAL': return 'text-blue-600';
      case 'MILD': return 'text-yellow-600';
      case 'HIGH': return 'text-orange-600';
      case 'VERY_HIGH': return 'text-red-600';
      default: return 'text-gray-500';
    }
  };

  const handleViewReport = (driverId: string) => {
    setSelectedDriverId(driverId);
    setShowHealthModal(true);
  };

  const handleExport = () => {
    console.log('Exporting health reports...');
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Heart className="h-8 w-8 text-red-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Health Reports</h1>
            <p className="text-gray-600">Monitor driver health metrics based on monitoring session data</p>
            <p className="text-sm text-blue-600 mt-1">Data from monitoring sessions with non-null driver IDs and health vitals</p>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Reports</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalReports}</p>
              <div className="flex items-center mt-2 text-sm text-blue-600">
                <BarChart3 className="h-4 w-4 mr-1" />
                <span>This month</span>
              </div>
            </div>
            <Heart className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Critical Cases</p>
              <p className="text-2xl font-bold text-red-600">{stats.criticalCases}</p>
              <div className="flex items-center mt-2 text-sm text-red-600">
                <AlertTriangle className="h-4 w-4 mr-1" />
                <span>Require attention</span>
              </div>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Risk Score</p>
              <p className="text-2xl font-bold text-orange-600">{stats.averageRiskScore.toFixed(1)}</p>
              <div className={`flex items-center mt-2 text-sm ${stats.trendsUp ? 'text-red-600' : 'text-green-600'}`}>
                {stats.trendsUp ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                <span>{stats.trendsUp ? '+0.2' : '-0.1'} from last month</span>
              </div>
            </div>
            <Activity className="h-8 w-8 text-orange-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Recent Checkups</p>
              <p className="text-2xl font-bold text-purple-600">
                {healthReports.filter(r => {
                  const daysDiff = (new Date().getTime() - new Date(r.reportDate).getTime()) / (1000 * 60 * 60 * 24);
                  return daysDiff <= 7;
                }).length}
              </p>
              <div className="flex items-center mt-2 text-sm text-purple-600">
                <Clock className="h-4 w-4 mr-1" />
                <span>Last 7 days</span>
              </div>
            </div>
            <Calendar className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex-1 relative">
            <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by driver name or ID..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
            <ChevronDown className={`h-4 w-4 transform transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Risk Level</label>
              <select
                value={filters.riskLevel}
                onChange={(e) => setFilters({ ...filters, riskLevel: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Risk Levels</option>
                <option value="NORMAL">Normal</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stress Level</label>
              <select
                value={filters.stressLevel}
                onChange={(e) => setFilters({ ...filters, stressLevel: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">All Stress Levels</option>
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="MILD">Mild</option>
                <option value="HIGH">High</option>
                <option value="VERY_HIGH">Very High</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">All Time</option>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
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

      {/* Health Reports Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Driver
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Report Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Blood Pressure
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Heart Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Breathing Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Oxygen Saturation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stress Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
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
                      <div className="animate-pulse h-4 w-16 bg-gray-200 rounded"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="animate-pulse h-4 w-12 bg-gray-200 rounded"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="animate-pulse h-4 w-12 bg-gray-200 rounded"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="animate-pulse h-4 w-12 bg-gray-200 rounded"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="animate-pulse h-6 w-16 bg-gray-200 rounded-full"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="animate-pulse h-6 w-16 bg-gray-200 rounded-full"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="animate-pulse h-8 w-8 bg-gray-200 rounded"></div>
                    </td>
                  </tr>
                ))
              ) : healthReports.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    No health reports found
                  </td>
                </tr>
              ) : (
                healthReports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        {report.driver.profilePhoto ? (
                          <img
                            src={report.driver.profilePhoto.startsWith('http://') || report.driver.profilePhoto.startsWith('https://') 
                              ? report.driver.profilePhoto 
                              : `${process.env.NEXT_PUBLIC_FLASK_API_BASE_URL || 'http://localhost:5000'}/driver_images/${report.driver.profilePhoto}`}
                            alt={report.driver.name}
                            className="h-10 w-10 rounded-full object-cover border-2 border-gray-200"
                          />
                        ) : (
                          <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{report.driver.name}</div>
                          <div className="text-sm text-gray-500">{report.driver.driverId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {format(new Date(report.reportDate), 'MMM dd, yyyy')}
                      </div>
                      <div className="text-sm text-gray-500">
                        {format(new Date(report.reportDate), 'HH:mm')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {report.blood_pressure || 
                         (report.bloodPressureHigh && report.bloodPressureLow 
                          ? `${report.bloodPressureHigh}/${report.bloodPressureLow}`
                          : 'N/A'
                         )}
                      </div>
                      <div className="text-sm text-gray-500">mmHg</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {report.heart_rate || report.heartRate || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">BPM</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {report.breathing_rate || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">breaths/min</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {report.oxygen_saturation || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">%</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${getStressLevelColor(report.stress_level || report.stressLevel)}`}>
                        {(report.stress_level || report.stressLevel) ? (report.stress_level || report.stressLevel).replace('_', ' ') : 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskLevelColor(report.riskLevel)}`}>
                        {report.riskLevel}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleViewReport(report.driver.id)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-md"
                        title="View Detailed Report"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing{' '}
                    <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>{' '}
                    to{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * itemsPerPage, totalReports)}
                    </span>{' '}
                    of{' '}
                    <span className="font-medium">{totalReports}</span>{' '}
                    results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === page
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </nav>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Health Report Modal */}
      {selectedDriverId && (
        <HealthReportModal
          isOpen={showHealthModal}
          onClose={() => {
            setShowHealthModal(false);
            setSelectedDriverId(null);
          }}
          driverId={selectedDriverId}
        />
      )}
    </div>
  );
}
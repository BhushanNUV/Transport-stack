'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import * as Dialog from '@radix-ui/react-dialog';
import * as Select from '@radix-ui/react-select';
import {
  Users,
  Plus,
  Search,
  Filter,
  Download,
  Edit,
  Trash2,
  Eye,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  X,
  User,
  Phone,
  Camera,
  Aperture,
} from 'lucide-react';
import { DriverWithRelations, CreateDriverData, DriversFilter, Gender, RiskLevel } from '@/types';
import HealthReportModal from '@/components/modals/HealthReportModal';
import SuccessModal from '@/components/modals/SuccessModal';
import CameraModal from '@/components/modals/CameraModal';
import ConfirmationModal from '@/components/modals/ConfirmationModal';
import { exportToExcel, ExcelColumn } from '@/utils/excelExport';
import Pagination from '@/components/common/Pagination';
import ItemsPerPageSelector from '@/components/common/ItemsPerPageSelector';

export default function DriversManagement() {
  const [drivers, setDrivers] = useState<DriverWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [driverToDelete, setDriverToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingDriver, setEditingDriver] = useState<DriverWithRelations | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: '', message: '' });
  const [isSearching, setIsSearching] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDrivers, setTotalDrivers] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Gender statistics
  const [genderStats, setGenderStats] = useState({
    male: 0,
    female: 0,
    other: 0
  });
  
  // Search debounce
  const [searchInput, setSearchInput] = useState('');
  const [searchDebounce, setSearchDebounce] = useState<NodeJS.Timeout | null>(null);

  // Filters
  const [filters, setFilters] = useState<DriversFilter>({
    search: '',
    gender: undefined,
  });

  // Sorting
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Form data
  const [formData, setFormData] = useState<CreateDriverData>({
    name: '',
    phone: '',
    age: 25,
    gender: 'MALE',
    address: '',
    dateOfBirth: null,
    weight: null,
    height: null,
  });

  const [formErrors, setFormErrors] = useState<Partial<CreateDriverData>>({});
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    fetchDrivers();
  }, [currentPage, filters, itemsPerPage]);

  useEffect(() => {
    fetchGenderStats();
  }, []);

  // Debounced search effect
  useEffect(() => {
    if (searchDebounce) {
      clearTimeout(searchDebounce);
    }
    
    if (searchInput !== filters.search) {
      setIsSearching(true);
    }
    
    const timeout = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchInput }));
      setCurrentPage(1); // Reset to first page on search
    }, 300);
    
    setSearchDebounce(timeout);
    
    return () => {
      if (searchDebounce) {
        clearTimeout(searchDebounce);
      }
    };
  }, [searchInput]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const hasActiveFilters = () => {
    return !!(
      filters.search ||
      filters.gender
    );
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      gender: undefined,
    });
    setSearchInput('');
    setCurrentPage(1);
  };

  const sortedDrivers = [...drivers].sort((a, b) => {
    if (!sortField) return 0;

    let aValue: any = a[sortField as keyof typeof a];
    let bValue: any = b[sortField as keyof typeof b];

    // Handle nested properties
    if (sortField === 'driverId') {
      aValue = a.driverId;
      bValue = b.driverId;
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

  const fetchDrivers = async () => {
    if (!isSearching) {
      setLoading(true);
    }
    setError(null);
    
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      });

      if (filters.search) params.append('search', filters.search);
      if (filters.gender) params.append('gender', filters.gender);

      const response = await fetch(`/api/drivers?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch drivers');
      }

      const result = await response.json();
      setDrivers(result.data);
      setTotalPages(result.pagination.totalPages);
      setTotalDrivers(result.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  };

  const fetchGenderStats = async () => {
    try {
      const response = await fetch('/api/drivers/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch gender statistics');
      }

      const result = await response.json();
      if (result.success && result.data) {
        setGenderStats({
          male: result.data.male,
          female: result.data.female,
          other: result.data.other,
        });
        // Also update total drivers from stats
        setTotalDrivers(result.data.total);
      }
    } catch (err) {
      console.error('Error fetching gender stats:', err);
    }
  };

  const validateForm = (data: CreateDriverData): boolean => {
    const errors: Partial<CreateDriverData> = {};

    if (!data.name.trim()) errors.name = 'Name is required';
    if (!data.phone.trim()) errors.phone = 'Phone is required';
    if (data.age < 18 || data.age > 70) errors.age = 'Age must be between 18 and 70' as any;

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm(formData)) return;

    setSubmitting(true);

    try {
      const url = editingDriver ? `/api/drivers/${editingDriver.id}` : '/api/drivers';
      const method = editingDriver ? 'PUT' : 'POST';

      let response: Response;

      if (selectedImage || (editingDriver && !imagePreview)) {
        // Use FormData for file upload or image removal
        const formDataToSend = new FormData();
        
        // Append all form fields
        Object.entries(formData).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            if (key === 'dateOfBirth' && value instanceof Date) {
              formDataToSend.append(key, value.toISOString().split('T')[0]);
            } else {
              formDataToSend.append(key, value.toString());
            }
          }
        });

        // Append image file if selected
        if (selectedImage) {
          formDataToSend.append('profilePhoto', selectedImage);
        }

        // Handle image removal for edit mode
        if (editingDriver && !imagePreview && !selectedImage) {
          formDataToSend.append('removePhoto', 'true');
        }

        response = await fetch(url, {
          method,
          body: formDataToSend,
        });
      } else {
        // Use JSON for simple data updates
        response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save driver');
      }

      await fetchDrivers();
      await fetchGenderStats(); // Refresh gender statistics
      handleCloseModal();
      
      // Show success modal
      setSuccessMessage({
        title: editingDriver ? 'Driver Updated' : 'Driver Added',
        message: editingDriver 
          ? `${formData.name} has been successfully updated in the system.`
          : `${formData.name} has been successfully added to the system.`
      });
      setShowSuccessModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (driver: DriverWithRelations) => {
    setDriverToDelete({ id: driver.id, name: driver.name });
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!driverToDelete) return;
    
    setDeleting(true);
    try {
      const response = await fetch(`/api/drivers/${driverToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete driver');
      }

      await fetchDrivers();
      await fetchGenderStats(); // Refresh gender statistics after deletion
      
      // Show success message
      setSuccessMessage({
        title: 'Driver Deleted',
        message: `${driverToDelete.name} has been successfully removed from the system.`
      });
      setShowSuccessModal(true);
      
      // Close delete modal
      setShowDeleteModal(false);
      setDriverToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setDeleting(false);
    }
  };

  const handleEdit = (driver: DriverWithRelations) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name,
      phone: driver.phone,
      age: driver.age,
      gender: driver.gender,
      address: driver.address || '',
      dateOfBirth: driver.dateOfBirth,
      weight: driver.weight,
      height: driver.height,
    });
    setSelectedImage(null);
    setImagePreview(driver.profilePhotoUrl || null);
    setShowEditModal(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }
      
      // File size validation removed - no limit
      
      setSelectedImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCapture = (imageBlob: Blob) => {
    // Convert blob to File object
    const file = new File([imageBlob], `driver_photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
    setSelectedImage(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setEditingDriver(null);
    setFormData({
      name: '',
      phone: '',
      age: 25,
      gender: 'MALE',
      address: '',
      dateOfBirth: null,
      weight: null,
      height: null,
    });
    setFormErrors({});
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleExport = async () => {
    try {
      // Define columns for Excel export
      const columns: ExcelColumn[] = [
        { header: 'Driver ID', key: 'driverId', width: 15, type: 'string' },
        { header: 'Name', key: 'name', width: 20 },
        { header: 'Email', key: 'email', width: 25 },
        { header: 'Phone', key: 'phone', width: 18, type: 'string' },
        { header: 'Age', key: 'age', width: 10, type: 'number' },
        { header: 'Gender', key: 'gender', width: 12 },
        { header: 'Date of Birth', key: 'dateOfBirth', width: 15, type: 'date' },
        { header: 'Address', key: 'address', width: 30 },
        { header: 'Weight (kg)', key: 'weight', width: 12, type: 'number' },
        { header: 'Height (cm)', key: 'height', width: 12, type: 'number' },
        { header: 'Created At', key: 'createdAt', width: 20, type: 'date' },
      ];

      // Use filtered and sorted data for export
      exportToExcel({
        filename: 'drivers_report',
        sheetName: 'Drivers',
        columns,
        data: sortedDrivers,
      });
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data. Please try again.');
    }
  };

  const getRiskLevelBadge = (riskLevel: string) => {
    const colors = {
      NORMAL: 'bg-green-100 text-green-800',
      LOW: 'bg-yellow-100 text-yellow-800',
      MEDIUM: 'bg-orange-100 text-orange-800',
      HIGH: 'bg-red-100 text-red-800',
      CRITICAL: 'bg-red-200 text-red-900',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[riskLevel as keyof typeof colors] || colors.NORMAL}`}>
        {riskLevel || 'No Data'}
      </span>
    );
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Users className="h-8 w-8 text-blue-600 flex-shrink-0" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Drivers Management</h1>
            <p className="text-sm sm:text-base text-gray-600">Manage driver profiles and health information</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            onClick={handleExport}
            className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-sm sm:text-base"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm sm:text-base"
          >
            <Plus className="h-4 w-4" />
            <span>Add Driver</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Total Drivers</p>
              <p className="text-3xl font-bold text-gray-900">{totalDrivers}</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="h-7 w-7 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-3">Gender Distribution (All Drivers)</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Male</span>
                  <span className="text-sm font-semibold text-blue-600">
                    {genderStats.male}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Female</span>
                  <span className="text-sm font-semibold text-pink-600">
                    {genderStats.female}
                  </span>
                </div>
                {genderStats.other > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Other</span>
                    <span className="text-sm font-semibold text-gray-600">
                      {genderStats.other}
                    </span>
                  </div>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Ratio</span>
                  <span className="font-medium text-gray-700">
                    {genderStats.male}:{genderStats.female}
                  </span>
                </div>
              </div>
            </div>
            <div className="ml-6">
              <div className="h-12 w-12 bg-gradient-to-br from-blue-100 to-pink-100 rounded-lg flex items-center justify-center">
                <Users className="h-7 w-7 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, ID, or phone..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center justify-center space-x-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 text-sm sm:text-base"
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
            <ChevronDown className={`h-4 w-4 transform transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          {hasActiveFilters() && (
            <button
              onClick={clearFilters}
              className="flex items-center space-x-2 px-4 py-2 text-red-600 bg-red-50 rounded-md hover:bg-red-100 text-sm sm:text-base"
            >
              <X className="h-4 w-4" />
              <span>Clear Filters</span>
            </button>
          )}
        </div>

        {showFilters && (
          <div className="pt-4 border-t border-gray-200">
            <div className="max-w-xs">
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select
                value={filters.gender || ''}
                onChange={(e) => setFilters({ ...filters, gender: e.target.value as Gender || undefined })}
                className="w-full p-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Genders</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
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

      {/* Drivers Table - Desktop */}
      <div className="hidden sm:block bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            {loading ? (
              <span>Loading...</span>
            ) : (
              <span>{totalDrivers} driver{totalDrivers !== 1 ? 's' : ''} found</span>
            )}
          </div>
          <ItemsPerPageSelector
            value={itemsPerPage}
            onChange={handleItemsPerPageChange}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center space-x-1 hover:text-gray-700"
                  >
                    <span>Driver</span>
                    <div className="flex flex-col">
                      <ChevronUp 
                        className={`h-3 w-3 -mb-1 ${
                          sortField === 'name' && sortOrder === 'asc' 
                            ? 'text-blue-600' 
                            : 'text-gray-400'
                        }`} 
                      />
                      <ChevronDown 
                        className={`h-3 w-3 -mt-1 ${
                          sortField === 'name' && sortOrder === 'desc' 
                            ? 'text-blue-600' 
                            : 'text-gray-400'
                        }`} 
                      />
                    </div>
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('phone')}
                    className="flex items-center space-x-1 hover:text-gray-700"
                  >
                    <span>Contact</span>
                    <div className="flex flex-col">
                      <ChevronUp 
                        className={`h-3 w-3 -mb-1 ${
                          sortField === 'phone' && sortOrder === 'asc' 
                            ? 'text-blue-600' 
                            : 'text-gray-400'
                        }`} 
                      />
                      <ChevronDown 
                        className={`h-3 w-3 -mt-1 ${
                          sortField === 'phone' && sortOrder === 'desc' 
                            ? 'text-blue-600' 
                            : 'text-gray-400'
                        }`} 
                      />
                    </div>
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('gender')}
                    className="flex items-center space-x-1 hover:text-gray-700"
                  >
                    <span>Gender</span>
                    <div className="flex flex-col">
                      <ChevronUp 
                        className={`h-3 w-3 -mb-1 ${
                          sortField === 'gender' && sortOrder === 'asc' 
                            ? 'text-blue-600' 
                            : 'text-gray-400'
                        }`} 
                      />
                      <ChevronDown 
                        className={`h-3 w-3 -mt-1 ${
                          sortField === 'gender' && sortOrder === 'desc' 
                            ? 'text-blue-600' 
                            : 'text-gray-400'
                        }`} 
                      />
                    </div>
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                // Loading skeleton
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="animate-pulse">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                          <div className="space-y-2">
                            <div className="h-4 w-24 bg-gray-200 rounded"></div>
                            <div className="h-3 w-16 bg-gray-200 rounded"></div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="animate-pulse space-y-2">
                        <div className="h-3 w-32 bg-gray-200 rounded"></div>
                        <div className="h-3 w-24 bg-gray-200 rounded"></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="animate-pulse">
                        <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="animate-pulse flex space-x-2">
                        <div className="h-8 w-8 bg-gray-200 rounded"></div>
                        <div className="h-8 w-8 bg-gray-200 rounded"></div>
                        <div className="h-8 w-8 bg-gray-200 rounded"></div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : sortedDrivers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    No drivers found
                  </td>
                </tr>
              ) : (
                sortedDrivers.map((driver) => {
                  return (
                    <tr key={driver.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden">
                            {driver.profilePhotoUrl ? (
                              <img
                                src={driver.profilePhotoUrl}
                                alt={driver.name}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <User className="h-5 w-5 text-blue-600" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{driver.name}</div>
                            <div className="text-sm text-gray-500">{driver.driverId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2 text-sm text-gray-900">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span>{driver.phone}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          driver.gender === 'MALE' 
                            ? 'bg-blue-100 text-blue-800' 
                            : driver.gender === 'FEMALE'
                            ? 'bg-pink-100 text-pink-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {driver.gender}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedDriver(driver.id);
                              setShowHealthModal(true);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-md"
                            title="View Health Report"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(driver)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
                            title="Edit Driver"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(driver)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-md"
                            title="Delete Driver"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalDrivers}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Drivers List - Mobile */}
      <div className="sm:hidden space-y-4">
        {loading ? (
          // Loading skeleton for mobile
          Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="animate-pulse space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-gray-200 rounded"></div>
                    <div className="h-3 w-24 bg-gray-200 rounded"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-full bg-gray-200 rounded"></div>
                  <div className="h-3 w-3/4 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          ))
        ) : sortedDrivers.length === 0 ? (
          <div className="bg-white p-8 rounded-lg border border-gray-200 text-center">
            <p className="text-gray-500">No drivers found</p>
          </div>
        ) : (
          sortedDrivers.map((driver) => (
            <div key={driver.id} className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                    {driver.profilePhotoUrl ? (
                      <img
                        src={driver.profilePhotoUrl}
                        alt={driver.name}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-6 w-6 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{driver.name}</h3>
                    <p className="text-xs text-gray-500">{driver.driverId}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => {
                      setSelectedDriver(driver.id);
                      setShowHealthModal(true);
                    }}
                    className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md"
                    title="View Health Report"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(driver)}
                    className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md"
                    title="Edit Driver"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(driver)}
                    className="p-1.5 text-red-600 hover:bg-red-100 rounded-md"
                    title="Delete Driver"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Phone:</span>
                  <span className="text-gray-900 font-medium">{driver.phone}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Gender:</span>
                  <span className="text-gray-900 font-medium">{driver.gender}</span>
                </div>
              </div>
            </div>
          ))
        )}
        
        {/* Mobile Pagination */}
        {totalPages > 1 && (
          <div className="bg-white rounded-lg border border-gray-200 mt-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalDrivers}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              showItemsInfo={false}
            />
          </div>
        )}
      </div>

      {/* Add/Edit Driver Modal */}
      <Dialog.Root open={showAddModal || showEditModal} onOpenChange={handleCloseModal}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed inset-x-4 top-1/2 transform -translate-y-1/2 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 bg-white rounded-lg shadow-xl max-w-2xl w-auto sm:w-full max-h-[90vh] overflow-hidden z-50">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <Dialog.Title className="text-xl font-semibold text-gray-900">
                {editingDriver ? 'Edit Driver' : 'Add New Driver'}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md">
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Profile Photo Upload */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Profile Photo
                </label>
                <div className="flex flex-col sm:flex-row items-center sm:space-x-6 space-y-4 sm:space-y-0">
                  <div className="relative">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Profile preview"
                        className="h-24 w-24 rounded-full object-cover border-2 border-gray-300"
                      />
                    ) : (
                      <div className="h-24 w-24 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-300">
                        <User className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 w-full">
                    <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
                      <label
                        htmlFor="profile-photo"
                        className={`flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <Camera className="h-4 w-4" />
                        <span>Choose Photo</span>
                        <input
                          id="profile-photo"
                          type="file"
                          accept="image/*"
                          disabled={submitting}
                          onChange={handleImageChange}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowCameraModal(true)}
                        disabled={submitting}
                        className={`flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <Aperture className="h-4 w-4" />
                        <span>Capture Photo</span>
                      </button>
                      {imagePreview && (
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => {
                            setSelectedImage(null);
                            setImagePreview(null);
                          }}
                          className="px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      JPG, PNG supported. Recommended: 400x400px. Use "Capture Photo" to take an instant photo.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={submitting}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full p-3 border rounded-md text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${
                      formErrors.name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter full name"
                  />
                  {formErrors.name && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>
                  )}
                </div>


                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    disabled={submitting}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={`w-full p-3 border rounded-md text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${
                      formErrors.phone ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter phone number"
                  />
                  {formErrors.phone && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.phone}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Age *
                  </label>
                  <input
                    type="number"
                    required
                    min="18"
                    max="70"
                    disabled={submitting}
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) })}
                    className={`w-full p-3 border rounded-md text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${
                      formErrors.age ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.age && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.age}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender *
                  </label>
                  <select
                    required
                    disabled={submitting}
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as Gender })}
                    className="w-full p-3 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    disabled={submitting}
                    value={formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString().split('T')[0] : ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      dateOfBirth: e.target.value ? new Date(e.target.value) : undefined 
                    })}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    min="30"
                    max="200"
                    step="0.1"
                    disabled={submitting}
                    value={formData.weight || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      weight: e.target.value ? parseFloat(e.target.value) : undefined 
                    })}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="Enter weight"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    min="120"
                    max="220"
                    step="0.1"
                    disabled={submitting}
                    value={formData.height || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      height: e.target.value ? parseFloat(e.target.value) : undefined 
                    })}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="Enter height"
                  />
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  rows={3}
                  disabled={submitting}
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="Enter address"
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>{editingDriver ? 'Updating...' : 'Adding...'}</span>
                    </>
                  ) : (
                    <span>{editingDriver ? 'Update Driver' : 'Add Driver'}</span>
                  )}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Health Report Modal */}
      {selectedDriver && (
        <HealthReportModal
          isOpen={showHealthModal}
          onClose={() => {
            setShowHealthModal(false);
            setSelectedDriver(null);
          }}
          driverId={selectedDriver}
        />
      )}

      {/* Camera Modal */}
      <CameraModal
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onCapture={handleCameraCapture}
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title={successMessage.title}
        message={successMessage.message}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDriverToDelete(null);
        }}
        onConfirm={handleDelete}
        title="Delete Driver"
        message={`Are you sure you want to delete ${driverToDelete?.name}? This action cannot be undone and will remove all associated health records and monitoring data.`}
        confirmText="Delete Driver"
        cancelText="Cancel"
        type="danger"
        loading={deleting}
      />
    </div>
  );
}
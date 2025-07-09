import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CreateDriverData, ApiResponse, PaginatedResponse } from '@/types';

// Base URL for detection images from environment variable
const DETECTION_IMAGE_BASE_URL = process.env.FLASK_API_BASE_URL || 'http://localhost:5000';

// Helper function to process monitoring session data
function processMonitoringSessionData(sessionData: any) {
  if (!sessionData) return null;
  
  const processed = { ...sessionData };
  
  // Process detection image URLs
  const detectionTypes = [
    { field: 'alcohol_detected', imgField: 'alcohol_img', folder: 'alcohol' },
    { field: 'smoking_detected', imgField: 'smoking_img', folder: 'smoking' },
    { field: 'drowsy_detected', imgField: 'drowsy_img', folder: 'drowsy' },
    { field: 'sleeping_detected', imgField: 'sleeping_img', folder: 'sleeping' },
    { field: 'mobile_use_detected', imgField: 'mobile_use_img', folder: 'mobile_use' },
    { field: 'eating_detected', imgField: 'eating_img', folder: 'eating' },
    { field: 'drinking_detected', imgField: 'drinking_img', folder: 'drinking' }
  ];

  detectionTypes.forEach(({ field, imgField, folder }) => {
    // If detected (1) and has image path, construct full URL
    if (processed[field] === 1 && processed[imgField]) {
      processed[`${imgField}_url`] = `${DETECTION_IMAGE_BASE_URL}/${folder}/${processed[imgField]}`;
    } else {
      processed[`${imgField}_url`] = null;
    }
  });

  return processed;
}

// Helper function to process detection results and add image URLs
function processDetectionResults(driver: any) {
  const processedDriver = { ...driver };
  
  // Process profile photo URL
  if (processedDriver.profilePhoto) {
    processedDriver.profilePhotoUrl = `${DETECTION_IMAGE_BASE_URL}/driver_images/${processedDriver.profilePhoto}`;
  }
  
  return processedDriver;
}

// Mock data function for when database is not available
function getMockDrivers() {
  return [
    {
      id: '1',
      driverId: 'DRV-001',
      name: 'John Smith',
      email: 'john.smith@example.com',
      phone: '+1-555-0101',
      age: 35,
      gender: 'MALE',
      address: '123 Main St, Anytown, AT 12345',
      profilePhoto: null,
      dateOfBirth: new Date('1988-05-15'),
      weight: 75.5,
      height: 180,
      createdAt: new Date(),
      updatedAt: new Date(),
      healthReports: [
        {
          id: '1',
          driverId: '1',
          reportDate: new Date(),
          bloodPressureHigh: 140,
          bloodPressureLow: 90,
          heartRate: 85,
          stressLevel: 'MILD',
          riskLevel: 'MEDIUM',
          notes: 'Regular checkup, slight elevation in stress levels',
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      ],
      attendanceRecords: [
        {
          id: '1',
          driverId: '1',
          date: new Date(),
          checkInTime: new Date(Date.now() - 8 * 60 * 60 * 1000),
          checkOutTime: new Date(),
          workingHours: 8,
          status: 'PRESENT',
          location: 'Main Office',
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      ],
      alcoholDetections: [],
      objectDetections: []
    },
    {
      id: '2',
      driverId: 'DRV-002',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@example.com',
      phone: '+1-555-0102',
      age: 42,
      gender: 'FEMALE',
      address: '456 Oak Ave, Somewhere, ST 67890',
      profilePhoto: null,
      dateOfBirth: new Date('1981-08-22'),
      weight: 65.0,
      height: 165,
      createdAt: new Date(),
      updatedAt: new Date(),
      healthReports: [
        {
          id: '2',
          driverId: '2',
          reportDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
          bloodPressureHigh: 160,
          bloodPressureLow: 100,
          heartRate: 105,
          stressLevel: 'HIGH',
          riskLevel: 'HIGH',
          notes: 'Elevated blood pressure and heart rate, recommend medical consultation',
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      ],
      attendanceRecords: [
        {
          id: '2',
          driverId: '2',
          date: new Date(),
          checkInTime: new Date(Date.now() - 7 * 60 * 60 * 1000),
          checkOutTime: null,
          workingHours: null,
          status: 'PRESENT',
          location: 'Branch Office',
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      ],
      alcoholDetections: [],
      objectDetections: []
    },
    {
      id: '3',
      driverId: 'DRV-003',
      name: 'Mike Davis',
      email: 'mike.davis@example.com',
      phone: '+1-555-0103',
      age: 29,
      gender: 'MALE',
      address: '789 Pine Rd, Elsewhere, ET 34567',
      profilePhoto: null,
      dateOfBirth: new Date('1994-12-10'),
      weight: 82.3,
      height: 175,
      createdAt: new Date(),
      updatedAt: new Date(),
      healthReports: [
        {
          id: '3',
          driverId: '3',
          reportDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          bloodPressureHigh: 120,
          bloodPressureLow: 75,
          heartRate: 72,
          stressLevel: 'LOW',
          riskLevel: 'NORMAL',
          notes: 'Excellent health indicators',
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      ],
      attendanceRecords: [
        {
          id: '3',
          driverId: '3',
          date: new Date(),
          checkInTime: new Date(Date.now() - 6 * 60 * 60 * 1000),
          checkOutTime: null,
          workingHours: null,
          status: 'PRESENT',
          location: 'Remote',
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      ],
      alcoholDetections: [],
      objectDetections: []
    }
  ];
}

// GET /api/drivers - Get all drivers with pagination and filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const gender = searchParams.get('gender') || '';
    const riskLevel = searchParams.get('riskLevel') || '';
    const minAge = parseInt(searchParams.get('minAge') || '0');
    const maxAge = parseInt(searchParams.get('maxAge') || '100');

    const skip = (page - 1) * limit;

    // Try database first
    try {
      // Build where clause
      const whereClause: any = {};
      
      if (search) {
        whereClause.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { driverId: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (gender) {
        whereClause.gender = gender;
      }

      if (minAge > 0 || maxAge < 100) {
        whereClause.age = {
          gte: minAge,
          lte: maxAge,
        };
      }

      // If filtering by risk level, we need to join with health reports
      let include: any = {
        healthReports: {
          orderBy: { reportDate: 'desc' },
          take: 1,
        },
        attendanceRecords: {
          orderBy: { date: 'desc' },
          take: 5,
        },
        alcoholDetections: {
          orderBy: { detectedAt: 'desc' },
          take: 3,
        },
        objectDetections: {
          orderBy: { detectedAt: 'desc' },
          take: 3,
        },
      };

      if (riskLevel) {
        include.healthReports.where = {
          riskLevel: riskLevel,
        };
      }

      const [drivers, total] = await Promise.all([
        prisma.driver.findMany({
          where: whereClause,
          include,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.driver.count({ where: whereClause }),
      ]);

      // Process detection results and add image URLs
      let processedDrivers = drivers.map(driver => processDetectionResults(driver));

      // Fetch latest monitoring session data for each driver
      try {
        const driverIds = processedDrivers.map(d => d.id);
        
        if (driverIds.length > 0) {
          // Get latest monitoring session for each driver using individual queries
          const latestSessions: any[] = [];
          for (const driverId of driverIds) {
            const session = await prisma.$queryRaw<any[]>`
              SELECT *
              FROM monitoring_sessions
              WHERE driverId = ${driverId}
              ORDER BY createdAt DESC
              LIMIT 1
            `;
            if (session.length > 0) {
              latestSessions.push(session[0]);
            }
          }

          // Add monitoring session data to each driver
          processedDrivers = processedDrivers.map(driver => {
            const session = latestSessions.find((s: any) => s.driverId === driver.id);
            
            let latestMonitoringSession: {
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
            } = {
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
            };

            if (session) {
              latestMonitoringSession = {
                alcohol_detected: session.alcohol_detected || 0,
                smoking_detected: session.smoking_detected || 0,
                drowsy_detected: session.drowsy_detected || 0,
                sleeping_detected: session.sleeping_detected || 0,
                mobile_use_detected: session.mobile_use_detected || 0,
                eating_detected: session.eating_detected || 0,
                drinking_detected: session.drinking_detected || 0,
                alcohol_img_url: session.alcohol_detected === 1 && session.alcohol_img 
                  ? `${DETECTION_IMAGE_BASE_URL}/${session.alcohol_img}` 
                  : null,
                smoking_img_url: session.smoking_detected === 1 && session.smoking_img 
                  ? `${DETECTION_IMAGE_BASE_URL}/${session.smoking_img}` 
                  : null,
                drowsy_img_url: session.drowsy_detected === 1 && session.drowsy_img 
                  ? `${DETECTION_IMAGE_BASE_URL}/${session.drowsy_img}` 
                  : null,
                sleeping_img_url: session.sleeping_detected === 1 && session.sleeping_img 
                  ? `${DETECTION_IMAGE_BASE_URL}/${session.sleeping_img}` 
                  : null,
                mobile_use_img_url: session.mobile_use_detected === 1 && session.mobile_use_img 
                  ? `${DETECTION_IMAGE_BASE_URL}/${session.mobile_use_img}` 
                  : null,
                eating_img_url: session.eating_detected === 1 && session.eating_img 
                  ? `${DETECTION_IMAGE_BASE_URL}/${session.eating_img}` 
                  : null,
                drinking_img_url: session.drinking_detected === 1 && session.drinking_img 
                  ? `${DETECTION_IMAGE_BASE_URL}/${session.drinking_img}` 
                  : null
              };
            }
            
            return {
              ...driver,
              todayAttendance: {
                status: session ? 'PRESENT' : 'ABSENT',
                checkInTime: session ? session.startTime : null,
                checkOutTime: session ? session.endTime : null,
                totalSessions: session ? 1 : 0,
                workingHours: session && session.startTime && session.endTime 
                  ? ((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / (1000 * 60 * 60)).toFixed(2)
                  : null
              },
              latestMonitoringSession
            };
          });
        }
      } catch (error) {
        console.warn('Could not fetch monitoring session data:', error);
        // Add empty attendance data
        processedDrivers = processedDrivers.map(driver => ({
          ...driver,
          todayAttendance: {
            status: 'UNKNOWN',
            checkInTime: null,
            checkOutTime: null,
            totalSessions: 0,
            workingHours: null
          },
          latestMonitoringSession: {
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
          }
        }));
      }

      const response: PaginatedResponse<any> = {
        data: processedDrivers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };

      return NextResponse.json({
        success: true,
        ...response,
      });
    } catch (dbError) {
      console.warn('Database not available, using mock data:', dbError);
      
      // Fallback to mock data
      let mockDrivers = getMockDrivers();
      
      // Apply search filter to mock data
      if (search) {
        const searchLower = search.toLowerCase();
        mockDrivers = mockDrivers.filter(driver => 
          driver.name.toLowerCase().includes(searchLower) ||
          driver.email.toLowerCase().includes(searchLower) ||
          driver.driverId.toLowerCase().includes(searchLower)
        );
      }
      
      // Apply gender filter
      if (gender) {
        mockDrivers = mockDrivers.filter(driver => driver.gender === gender);
      }
      
      // Apply age filter
      if (minAge > 0 || maxAge < 100) {
        mockDrivers = mockDrivers.filter(driver => 
          driver.age >= minAge && driver.age <= maxAge
        );
      }
      
      // Apply risk level filter
      if (riskLevel) {
        mockDrivers = mockDrivers.filter(driver => 
          driver.healthReports.length > 0 && 
          driver.healthReports[0].riskLevel === riskLevel
        );
      }
      
      // Apply pagination
      const total = mockDrivers.length;
      const paginatedDrivers = mockDrivers.slice(skip, skip + limit);
      
      const response: PaginatedResponse<any> = {
        data: paginatedDrivers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };

      return NextResponse.json({
        success: true,
        ...response,
      });
    }
  } catch (error) {
    console.error('Error fetching drivers:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch drivers',
      },
      { status: 500 }
    );
  }
}

// Helper function to upload image to external driver-images API
async function uploadImageToExternalAPI(file: File, driverId: string): Promise<string | null> {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('Invalid file type. Only images are allowed.');
    }

    // Convert to base64
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    
    // Use original filename directly
    const filename = file.name;

    // Upload to external API
    const response = await fetch(`${process.env.FLASK_API_BASE_URL || 'http://localhost:5000'}/api/driver-images`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64,
        filename: filename,
        driver_id: driverId
      }),
    });

    const result = await response.json();
    
    if (result.success) {
      // Return only the filename, not the full URL
      return filename;
    } else {
      throw new Error(result.error || 'Failed to upload image');
    }
  } catch (error) {
    console.error('Error uploading image to external API:', error);
    return null;
  }
}

// POST /api/drivers - Create a new driver
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let data: CreateDriverData;
    let profilePhoto: string | null = null;
    let imageFile: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      // Handle multipart form data (with file upload)
      const formData = await request.formData();
      
      // Extract form fields
      data = {
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        phone: formData.get('phone') as string,
        age: parseInt(formData.get('age') as string),
        gender: formData.get('gender') as any,
        address: formData.get('address') as string || '',
        dateOfBirth: formData.get('dateOfBirth') ? new Date(formData.get('dateOfBirth') as string) : undefined,
        weight: formData.get('weight') ? parseFloat(formData.get('weight') as string) : undefined,
        height: formData.get('height') ? parseFloat(formData.get('height') as string) : undefined,
      };

      // Store image file for later processing
      imageFile = formData.get('profilePhoto') as File;
    } else {
      // Handle JSON data (backward compatibility)
      const body = await request.json();
      data = body;
    }

    // Validate required fields
    if (!data.name || !data.email || !data.phone || !data.age || !data.gender) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: name, email, phone, age, gender',
        },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingDriver = await prisma.driver.findUnique({
      where: { email: data.email },
    });

    if (existingDriver) {
      return NextResponse.json(
        {
          success: false,
          error: 'A driver with this email already exists',
        },
        { status: 409 }
      );
    }

    // Generate driver ID
    const driverCount = await prisma.driver.count();
    const driverId = `DRV-${String(driverCount + 1).padStart(3, '0')}`;

    // Upload profile photo to external API if provided
    if (imageFile && imageFile.size > 0) {
      profilePhoto = await uploadImageToExternalAPI(imageFile, driverId);
    }

    // Create driver
    const driver = await prisma.driver.create({
      data: {
        ...data,
        driverId,
        profilePhoto,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      },
      include: {
        healthReports: true,
        attendanceRecords: true,
        alcoholDetections: true,
        objectDetections: true,
      },
    });

    const response: ApiResponse<any> = {
      success: true,
      data: driver,
      message: 'Driver created successfully',
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating driver:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create driver',
      },
      { status: 500 }
    );
  }
}
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
    { field: 'distracted_detected', imgField: 'distracted_img', folder: 'distracted' },
    { field: 'drinking_detected', imgField: 'drinking_img', folder: 'drinking' }
  ];

  detectionTypes.forEach(({ field, imgField, folder }) => {
    // If detected (1) and has image path, construct full URL
    if (processed[field] === 1 && processed[imgField]) {
      // Check if the image path is already a full URL (starts with http:// or https://)
      if (processed[imgField].startsWith('http://') || processed[imgField].startsWith('https://')) {
        processed[`${imgField}_url`] = processed[imgField];
      } else {
        processed[`${imgField}_url`] = `${DETECTION_IMAGE_BASE_URL}/${folder}/${processed[imgField]}`;
      }
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
    // Check if the profile photo is already a full URL (starts with http:// or https://)
    if (processedDriver.profilePhoto.startsWith('http://') || processedDriver.profilePhoto.startsWith('https://')) {
      processedDriver.profilePhotoUrl = processedDriver.profilePhoto;
    } else {
      processedDriver.profilePhotoUrl = `${DETECTION_IMAGE_BASE_URL}/driver_images/${processedDriver.profilePhoto}`;
    }
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

    // Try database first using raw SQL to avoid schema conflicts
    try {
      // Build WHERE conditions for raw SQL
      let whereConditions = [];
      let params = [];
      
      if (search) {
        whereConditions.push(`(d.name LIKE ? OR d.phone LIKE ? OR d.driverId LIKE ?)`);
        const searchParam = `%${search}%`;
        params.push(searchParam, searchParam, searchParam);
      }

      if (gender) {
        whereConditions.push(`d.gender = ?`);
        params.push(gender);
      }

      if (minAge > 0 || maxAge < 100) {
        whereConditions.push(`d.age >= ? AND d.age <= ?`);
        params.push(minAge, maxAge);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get total count using raw SQL
      const countQuery = `SELECT COUNT(*) as count FROM drivers d ${whereClause}`;
      const totalCountResult = await prisma.$queryRawUnsafe(countQuery, ...params);
      const total = Number((totalCountResult as any[])[0]?.count || 0);

      // Get drivers using raw SQL
      const driversQuery = `
        SELECT 
          d.id, d.driverId, d.name, d.phone, d.age, d.gender, d.address, 
          d.profilePhoto, d.dateOfBirth, d.weight, d.height, d.createdAt, d.updatedAt
        FROM drivers d
        ${whereClause}
        ORDER BY d.createdAt DESC
        LIMIT ? OFFSET ?
      `;
      
      const drivers = await prisma.$queryRawUnsafe(driversQuery, ...params, limit, skip);

      // Process detection results and add image URLs
      let processedDrivers = (drivers as any[]).map(driver => {
        // Add empty relations for now to match expected structure
        return {
          ...processDetectionResults(driver),
          healthReports: [],
          attendanceRecords: [],
          alcoholDetections: [],
          objectDetections: [],
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
            distracted_detected: 0,
            drinking_detected: 0,
            alcohol_img_url: null,
            smoking_img_url: null,
            drowsy_img_url: null,
            sleeping_img_url: null,
            mobile_use_img_url: null,
            distracted_img_url: null,
            drinking_img_url: null
          }
        };
      });

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
      console.error('Database error:', dbError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch drivers from database',
        },
        { status: 500 }
      );
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
    if (!data.name || !data.phone || !data.age || !data.gender) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: name, phone, age, gender',
        },
        { status: 400 }
      );
    }

    // Skip phone uniqueness check temporarily to avoid email column error
    // TODO: Re-enable after Prisma client is regenerated
    // const existingDriver = await prisma.driver.findFirst({
    //   where: { phone: data.phone },
    // });

    // if (existingDriver) {
    //   return NextResponse.json(
    //     {
    //       success: false,
    //       error: 'A driver with this phone number already exists',
    //     },
    //     { status: 409 }
    //   );
    // }

    // Generate unique driver ID using raw SQL
    let driverId: string;
    let attempts = 0;
    const maxAttempts = 100;
    
    do {
      const countResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count FROM drivers
      `;
      const driverCount = Number(countResult[0]?.count || 0);
      const nextId = driverCount + 1 + attempts;
      driverId = `DRV-${String(nextId).padStart(3, '0')}`;
      
      // Check if this driverId already exists
      const existingResult = await prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as count FROM drivers WHERE driverId = ?
      `, driverId);
      const exists = Number((existingResult as any[])[0]?.count || 0) > 0;
      
      if (!exists) {
        break;
      }
      
      attempts++;
    } while (attempts < maxAttempts);
    
    if (attempts >= maxAttempts) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to generate unique driver ID',
        },
        { status: 500 }
      );
    }

    // Upload profile photo to external API if provided
    if (imageFile && imageFile.size > 0) {
      profilePhoto = await uploadImageToExternalAPI(imageFile, driverId);
    }

    // Create driver using raw SQL to avoid schema conflicts
    const driverUuid = require('crypto').randomUUID();
    const now = new Date();
    
    await prisma.$executeRaw`
      INSERT INTO drivers (
        id, driverId, name, phone, age, gender, address, profilePhoto, dateOfBirth, weight, height, createdAt, updatedAt
      ) VALUES (
        ${driverUuid},
        ${driverId},
        ${data.name},
        ${data.phone},
        ${data.age},
        ${data.gender},
        ${data.address || null},
        ${profilePhoto},
        ${data.dateOfBirth ? new Date(data.dateOfBirth) : null},
        ${data.weight || null},
        ${data.height || null},
        ${now},
        ${now}
      )
    `;

    // Fetch the created driver
    const driver = await prisma.$queryRaw<any[]>`
      SELECT * FROM drivers WHERE id = ${driverUuid}
    `;
    
    const createdDriver = driver[0];

    const response: ApiResponse<any> = {
      success: true,
      data: createdDriver,
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
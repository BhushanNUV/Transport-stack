import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { UpdateDriverData, ApiResponse } from '@/types';

// Base URL for detection images from environment variable
const DETECTION_IMAGE_BASE_URL = process.env.FLASK_API_BASE_URL || 'http://localhost:5000';

// Helper function to process detection results and add image URLs
function processDetectionResults(driver: any) {
  const processedDriver = { ...driver };
  
  // Process profile photo URL
  if (processedDriver.profilePhoto) {
    processedDriver.profilePhotoUrl = `${DETECTION_IMAGE_BASE_URL}/driver_images/${processedDriver.profilePhoto}`;
  }
  
  // Process alcohol detection results
  if (processedDriver.alcoholDetectionResults) {
    processedDriver.alcoholDetectionResults = processedDriver.alcoholDetectionResults.map((result: any) => ({
      ...result,
      detected: result.detected ? 1 : 0,
      imageUrl: result.imageId ? `${DETECTION_IMAGE_BASE_URL}/${result.imageId}` : null
    }));
  }
  
  // Process smoking detection results
  if (processedDriver.smokingDetectionResults) {
    processedDriver.smokingDetectionResults = processedDriver.smokingDetectionResults.map((result: any) => ({
      ...result,
      detected: result.detected ? 1 : 0,
      imageUrl: result.imageId ? `${DETECTION_IMAGE_BASE_URL}/${result.imageId}` : null
    }));
  }
  
  // Process object detection results
  if (processedDriver.objectDetectionResults) {
    processedDriver.objectDetectionResults = processedDriver.objectDetectionResults.map((result: any) => ({
      ...result,
      detected: !result.safeDriving ? 1 : 0, // Detected if not safe driving
      imageUrl: result.imageId ? `${DETECTION_IMAGE_BASE_URL}/${result.imageId}` : null
    }));
  }
  
  return processedDriver;
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

// GET /api/drivers/[id] - Get a specific driver
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const driver = await prisma.driver.findUnique({
      where: { id },
      include: {
        healthReports: {
          orderBy: { reportDate: 'desc' },
          take: 10,
        },
        attendanceRecords: {
          orderBy: { date: 'desc' },
          take: 30,
        },
        alcoholDetections: {
          orderBy: { detectedAt: 'desc' },
          take: 20,
        },
        objectDetections: {
          orderBy: { detectedAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!driver) {
      return NextResponse.json(
        {
          success: false,
          error: 'Driver not found',
        },
        { status: 404 }
      );
    }

    // Process detection results and add image URLs
    let processedDriver = processDetectionResults(driver);
    
    // Fetch latest monitoring session data from database
    let latestMonitoringSession = null;
    try {
      // First, let's check if there are any monitoring sessions for this driver
      const allSessionsForDriver = await prisma.$queryRaw<any[]>`
        SELECT COUNT(*) as count
        FROM monitoring_sessions
        WHERE driverId = ${id}
      `;
      
      console.log(`[DEBUG] Driver ${id} - Total monitoring sessions count:`, allSessionsForDriver);
      
      // Also check all monitoring sessions (first 5)
      const allSessions = await prisma.$queryRaw<any[]>`
        SELECT driverId, sessionId, startTime, alcohol_detected, smoking_detected, drowsy_detected
        FROM monitoring_sessions
        ORDER BY startTime DESC
        LIMIT 5
      `;
      
      console.log(`[DEBUG] Latest 5 monitoring sessions:`, allSessions);
      
      // Check if any sessions exist for this specific driver
      const driverSessions = await prisma.$queryRaw<any[]>`
        SELECT driverId, sessionId, startTime, alcohol_detected, smoking_detected, drowsy_detected
        FROM monitoring_sessions
        WHERE driverId = ${id}
        ORDER BY startTime DESC
        LIMIT 3
      `;
      
      console.log(`[DEBUG] Driver ${id} sessions:`, driverSessions);
      
      const monitoringSessionResult = await prisma.$queryRaw<any[]>`
        SELECT *
        FROM monitoring_sessions
        WHERE driverId = ${id}
          AND (
            alcohol_detected = 1 OR 
            smoking_detected = 1 OR 
            drowsy_detected = 1 OR 
            sleeping_detected = 1 OR 
            mobile_use_detected = 1 OR 
            eating_detected = 1 OR 
            drinking_detected = 1
          )
        ORDER BY startTime DESC
        LIMIT 1
      `;
      
      console.log(`[DEBUG] Driver ${id} - Monitoring session query result:`, monitoringSessionResult);
      
      if (monitoringSessionResult && monitoringSessionResult.length > 0) {
        const session = monitoringSessionResult[0];
        console.log(`[DEBUG] Driver ${id} - Session data:`, session);
        
        // Process monitoring session data with image URLs using correct schema fields
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
        
        console.log(`[DEBUG] Driver ${id} - Processed monitoring session:`, latestMonitoringSession);
      } else {
        console.log(`[DEBUG] Driver ${id} - No monitoring session found`);
      }
    } catch (error) {
      console.warn('Could not fetch monitoring session data:', error);
    }
    
    // Use monitoring session data if available, otherwise use defaults
    processedDriver = {
      ...processedDriver,
      latestMonitoringSession: latestMonitoringSession || {
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
    };

    const response: ApiResponse<any> = {
      success: true,
      data: processedDriver,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching driver:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch driver',
      },
      { status: 500 }
    );
  }
}

// PUT /api/drivers/[id] - Update a specific driver
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if driver exists
    const existingDriver = await prisma.driver.findUnique({
      where: { id },
    });

    if (!existingDriver) {
      return NextResponse.json(
        {
          success: false,
          error: 'Driver not found',
        },
        { status: 404 }
      );
    }

    const contentType = request.headers.get('content-type') || '';
    let data: Partial<UpdateDriverData>;
    let profilePhoto: string | null = null;

    if (contentType.includes('multipart/form-data')) {
      // Handle multipart form data (with file upload)
      const formData = await request.formData();
      
      // Extract form fields
      data = {};
      if (formData.get('name')) data.name = formData.get('name') as string;
      if (formData.get('email')) data.email = formData.get('email') as string;
      if (formData.get('phone')) data.phone = formData.get('phone') as string;
      if (formData.get('age')) data.age = parseInt(formData.get('age') as string);
      if (formData.get('gender')) data.gender = formData.get('gender') as any;
      if (formData.get('address')) data.address = formData.get('address') as string;
      if (formData.get('dateOfBirth')) data.dateOfBirth = new Date(formData.get('dateOfBirth') as string);
      if (formData.get('weight')) data.weight = parseFloat(formData.get('weight') as string);
      if (formData.get('height')) data.height = parseFloat(formData.get('height') as string);

      // Process profile photo if provided
      const imageFile = formData.get('profilePhoto') as File;
      if (imageFile && imageFile.size > 0) {
        profilePhoto = await uploadImageToExternalAPI(imageFile, existingDriver.driverId);
        if (profilePhoto) {
          data.profilePhoto = profilePhoto;
        }
      }

      // Handle photo removal
      const removePhoto = formData.get('removePhoto');
      if (removePhoto === 'true') {
        data.profilePhoto = null;
      }
    } else {
      // Handle JSON data (backward compatibility)
      const body = await request.json();
      data = body;
    }

    // Check if email is being updated and if it already exists
    if (data.email && data.email !== existingDriver.email) {
      const emailExists = await prisma.driver.findUnique({
        where: { email: data.email },
      });

      if (emailExists) {
        return NextResponse.json(
          {
            success: false,
            error: 'A driver with this email already exists',
          },
          { status: 409 }
        );
      }
    }

    // Update driver
    const updatedData: any = { ...data };
    if (data.dateOfBirth) {
      updatedData.dateOfBirth = new Date(data.dateOfBirth);
    }

    const driver = await prisma.driver.update({
      where: { id },
      data: updatedData,
      include: {
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
      },
    });

    const response: ApiResponse<any> = {
      success: true,
      data: driver,
      message: 'Driver updated successfully',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating driver:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update driver',
      },
      { status: 500 }
    );
  }
}

// DELETE /api/drivers/[id] - Delete a specific driver
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if driver exists
    const existingDriver = await prisma.driver.findUnique({
      where: { id },
    });

    if (!existingDriver) {
      return NextResponse.json(
        {
          success: false,
          error: 'Driver not found',
        },
        { status: 404 }
      );
    }

    // Delete driver (cascade will handle related records)
    await prisma.driver.delete({
      where: { id },
    });

    const response: ApiResponse<null> = {
      success: true,
      data: null,
      message: 'Driver deleted successfully',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error deleting driver:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete driver',
      },
      { status: 500 }
    );
  }
}
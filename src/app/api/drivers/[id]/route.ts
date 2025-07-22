import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { UpdateDriverData, ApiResponse } from '@/types';
import { uploadImageToGCS, deleteImageFromGCS } from '@/lib/gcs';

// Base URL for detection images from environment variable
const DETECTION_IMAGE_BASE_URL = process.env.FLASK_API_BASE_URL || 'http://localhost:5000';

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

// Helper function to upload driver image to GCS
async function uploadDriverImageToGCS(file: File, driverId: string): Promise<string | null> {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('Invalid file type. Only images are allowed.');
    }

    // Upload to GCS and get the full public URL
    const publicUrl = await uploadImageToGCS(file, 'driver_images');
    
    return publicUrl;
  } catch (error) {
    console.error('Error uploading image to GCS:', error);
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

    // Get driver using raw SQL to avoid email column error
    const driverResult = await prisma.$queryRawUnsafe(`
      SELECT id, driverId, name, phone, age, gender, address, profilePhoto, dateOfBirth, weight, height, createdAt, updatedAt
      FROM drivers 
      WHERE id = ?
    `, id);
    
    const driver = (driverResult as any[])[0];

    if (!driver) {
      return NextResponse.json(
        {
          success: false,
          error: 'Driver not found',
        },
        { status: 404 }
      );
    }

    // Get related data using raw SQL queries
    const healthReports = await prisma.$queryRawUnsafe(`
      SELECT * FROM health_reports 
      WHERE driverId = ? 
      ORDER BY reportDate DESC 
      LIMIT 10
    `, id);

    const attendanceRecords = await prisma.$queryRawUnsafe(`
      SELECT * FROM attendance_records 
      WHERE driverId = ? 
      ORDER BY date DESC 
      LIMIT 30
    `, id);

    const alcoholDetections = await prisma.$queryRawUnsafe(`
      SELECT * FROM alcohol_detections 
      WHERE driverId = ? 
      ORDER BY detectedAt DESC 
      LIMIT 20
    `, id);

    const objectDetections = await prisma.$queryRawUnsafe(`
      SELECT * FROM object_detections 
      WHERE driverId = ? 
      ORDER BY detectedAt DESC 
      LIMIT 20
    `, id);

    // Combine the results
    const driverWithRelations = {
      ...driver,
      healthReports,
      attendanceRecords,
      alcoholDetections,
      objectDetections,
    };

    // Process detection results and add image URLs
    let processedDriver = processDetectionResults(driverWithRelations);
    
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
            distracted_detected = 1 OR 
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
          distracted_detected: session.distracted_detected || 0,
          drinking_detected: session.drinking_detected || 0,
          alcohol_img_url: session.alcohol_detected === 1 && session.alcohol_img 
            ? (session.alcohol_img.startsWith('http://') || session.alcohol_img.startsWith('https://') 
               ? session.alcohol_img 
               : `${DETECTION_IMAGE_BASE_URL}/${session.alcohol_img}`) 
            : null,
          smoking_img_url: session.smoking_detected === 1 && session.smoking_img 
            ? (session.smoking_img.startsWith('http://') || session.smoking_img.startsWith('https://') 
               ? session.smoking_img 
               : `${DETECTION_IMAGE_BASE_URL}/${session.smoking_img}`) 
            : null,
          drowsy_img_url: session.drowsy_detected === 1 && session.drowsy_img 
            ? (session.drowsy_img.startsWith('http://') || session.drowsy_img.startsWith('https://') 
               ? session.drowsy_img 
               : `${DETECTION_IMAGE_BASE_URL}/${session.drowsy_img}`) 
            : null,
          sleeping_img_url: session.sleeping_detected === 1 && session.sleeping_img 
            ? (session.sleeping_img.startsWith('http://') || session.sleeping_img.startsWith('https://') 
               ? session.sleeping_img 
               : `${DETECTION_IMAGE_BASE_URL}/${session.sleeping_img}`) 
            : null,
          mobile_use_img_url: session.mobile_use_detected === 1 && session.mobile_use_img 
            ? (session.mobile_use_img.startsWith('http://') || session.mobile_use_img.startsWith('https://') 
               ? session.mobile_use_img 
               : `${DETECTION_IMAGE_BASE_URL}/${session.mobile_use_img}`) 
            : null,
          distracted_img_url: session.distracted_detected === 1 && session.distracted_img 
            ? (session.distracted_img.startsWith('http://') || session.distracted_img.startsWith('https://') 
               ? session.distracted_img 
               : `${DETECTION_IMAGE_BASE_URL}/${session.distracted_img}`) 
            : null,
          drinking_img_url: session.drinking_detected === 1 && session.drinking_img 
            ? (session.drinking_img.startsWith('http://') || session.drinking_img.startsWith('https://') 
               ? session.drinking_img 
               : `${DETECTION_IMAGE_BASE_URL}/${session.drinking_img}`) 
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
    
    // Check if driver exists using raw SQL
    const existingDriverResult = await prisma.$queryRawUnsafe(`
      SELECT id, driverId, phone FROM drivers WHERE id = ?
    `, id);
    
    const existingDriver = (existingDriverResult as any[])[0];

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
        // Delete old image from GCS if it exists and is a GCS URL
        if (existingDriver.profilePhoto && existingDriver.profilePhoto.startsWith('https://storage.googleapis.com/')) {
          await deleteImageFromGCS(existingDriver.profilePhoto);
        }
        
        profilePhoto = await uploadDriverImageToGCS(imageFile, existingDriver.driverId);
        if (profilePhoto) {
          data.profilePhoto = profilePhoto;
        }
      }

      // Handle photo removal
      const removePhoto = formData.get('removePhoto');
      if (removePhoto === 'true') {
        // Delete image from GCS if it exists and is a GCS URL
        if (existingDriver.profilePhoto && existingDriver.profilePhoto.startsWith('https://storage.googleapis.com/')) {
          await deleteImageFromGCS(existingDriver.profilePhoto);
        }
        data.profilePhoto = null;
      }
    } else {
      // Handle JSON data (backward compatibility)
      const body = await request.json();
      data = body;
    }

    // Check if phone is being updated and if it already exists
    if (data.phone && data.phone !== existingDriver.phone) {
      const phoneExistsResult = await prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as count FROM drivers WHERE phone = ?
      `, data.phone);
      
      const phoneExists = Number((phoneExistsResult as any[])[0]?.count || 0) > 0;

      if (phoneExists) {
        return NextResponse.json(
          {
            success: false,
            error: 'A driver with this phone number already exists',
          },
          { status: 409 }
        );
      }
    }

    // Update driver using raw SQL
    const updatedData: any = { ...data };
    if (data.dateOfBirth) {
      updatedData.dateOfBirth = new Date(data.dateOfBirth);
    }

    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];
    
    if (updatedData.name) {
      updateFields.push('name = ?');
      updateValues.push(updatedData.name);
    }
    if (updatedData.phone) {
      updateFields.push('phone = ?');
      updateValues.push(updatedData.phone);
    }
    if (updatedData.age !== undefined) {
      updateFields.push('age = ?');
      updateValues.push(updatedData.age);
    }
    if (updatedData.gender) {
      updateFields.push('gender = ?');
      updateValues.push(updatedData.gender);
    }
    if (updatedData.address !== undefined) {
      updateFields.push('address = ?');
      updateValues.push(updatedData.address);
    }
    if (updatedData.profilePhoto !== undefined) {
      updateFields.push('profilePhoto = ?');
      updateValues.push(updatedData.profilePhoto);
    }
    if (updatedData.dateOfBirth !== undefined) {
      updateFields.push('dateOfBirth = ?');
      updateValues.push(updatedData.dateOfBirth);
    }
    if (updatedData.weight !== undefined) {
      updateFields.push('weight = ?');
      updateValues.push(updatedData.weight);
    }
    if (updatedData.height !== undefined) {
      updateFields.push('height = ?');
      updateValues.push(updatedData.height);
    }
    
    // Always update updatedAt
    updateFields.push('updatedAt = ?');
    updateValues.push(new Date());
    
    // Add id for WHERE clause
    updateValues.push(id);

    if (updateFields.length > 1) { // More than just updatedAt
      const updateQuery = `
        UPDATE drivers 
        SET ${updateFields.join(', ')} 
        WHERE id = ?
      `;
      
      await prisma.$executeRawUnsafe(updateQuery, ...updateValues);
    }

    // Fetch the updated driver
    const driverResult = await prisma.$queryRawUnsafe(`
      SELECT id, driverId, name, phone, age, gender, address, profilePhoto, dateOfBirth, weight, height, createdAt, updatedAt
      FROM drivers 
      WHERE id = ?
    `, id);
    
    const driver = (driverResult as any[])[0];

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

    // Check if driver exists using raw SQL
    const existingDriverResult = await prisma.$queryRawUnsafe(`
      SELECT id FROM drivers WHERE id = ?
    `, id);
    
    const existingDriver = (existingDriverResult as any[])[0];

    if (!existingDriver) {
      return NextResponse.json(
        {
          success: false,
          error: 'Driver not found',
        },
        { status: 404 }
      );
    }

    // Delete related records first to avoid foreign key constraints
    await prisma.$executeRawUnsafe(`DELETE FROM health_reports WHERE driverId = ?`, id);
    await prisma.$executeRawUnsafe(`DELETE FROM attendance_records WHERE driverId = ?`, id);
    await prisma.$executeRawUnsafe(`DELETE FROM alcohol_detections WHERE driverId = ?`, id);
    await prisma.$executeRawUnsafe(`DELETE FROM object_detections WHERE driverId = ?`, id);
    await prisma.$executeRawUnsafe(`DELETE FROM monitoring_sessions WHERE driverId = ?`, id);
    
    // Delete driver using raw SQL
    await prisma.$executeRawUnsafe(`DELETE FROM drivers WHERE id = ?`, id);

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
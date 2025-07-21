import { Storage } from '@google-cloud/storage';
import path from 'path';
import fs from 'fs';

// Initialize storage with better error handling
let storage: Storage;
let bucket: any;

try {
  // Try multiple paths for the credentials file
  const possiblePaths = [
    path.join(process.cwd(), 'numeric-ocean-454912-f4-304bce751e9d.json'),
    path.join(__dirname, '../../numeric-ocean-454912-f4-304bce751e9d.json'),
    '/home/mukesh/Transport-stack/numeric-ocean-454912-f4-304bce751e9d.json',
    process.env.GCS_CREDENTIALS_PATH || ''
  ];

  let credentialsPath = '';
  for (const p of possiblePaths) {
    if (p && fs.existsSync(p)) {
      credentialsPath = p;
      console.log('Found GCS credentials at:', p);
      break;
    }
  }

  if (!credentialsPath) {
    throw new Error('GCS credentials file not found. Please set GCS_CREDENTIALS_PATH environment variable.');
  }

  storage = new Storage({
    keyFilename: credentialsPath,
    projectId: 'numeric-ocean-454912-f4',
  });

  bucket = storage.bucket(process.env.GCS_BUCKET_NAME || 'driver-health-monitoring-images');
} catch (error) {
  console.error('Failed to initialize GCS:', error);
}

export async function uploadImageToGCS(
  file: File,
  folder: string = 'driver_images'
): Promise<string | null> {
  try {
    if (!storage || !bucket) {
      throw new Error('Google Cloud Storage is not initialized. Please check credentials.');
    }
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `${folder}/${timestamp}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
    
    const blob = bucket.file(fileName);
    const blobStream = blob.createWriteStream({
      resumable: false,
      metadata: {
        contentType: file.type,
      },
    });

    const buffer = Buffer.from(await file.arrayBuffer());

    return new Promise((resolve, reject) => {
      blobStream
        .on('error', (err) => {
          console.error('GCS upload error:', err);
          reject(err);
        })
        .on('finish', async () => {
          await blob.makePublic();
          const bucketName = process.env.GCS_BUCKET_NAME || 'driver-health-monitoring-images';
          const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
          resolve(publicUrl);
        })
        .end(buffer);
    });
  } catch (error) {
    console.error('Error uploading to GCS:', error);
    return null;
  }
}

export async function deleteImageFromGCS(fileUrl: string): Promise<boolean> {
  try {
    if (!storage || !bucket) {
      throw new Error('Google Cloud Storage is not initialized. Please check credentials.');
    }
    const urlParts = fileUrl.split('/');
    const fileName = urlParts.slice(-2).join('/'); // Get folder/filename
    
    await bucket.file(fileName).delete();
    return true;
  } catch (error) {
    console.error('Error deleting from GCS:', error);
    return false;
  }
}
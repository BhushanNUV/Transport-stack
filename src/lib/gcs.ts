import { Storage } from '@google-cloud/storage';
import path from 'path';

const storage = new Storage({
  keyFilename: path.join(process.cwd(), 'numeric-ocean-454912-f4-304bce751e9d.json'),
  projectId: 'numeric-ocean-454912-f4',
});

const bucketName = process.env.GCS_BUCKET_NAME || 'driver-health-monitoring-images';
const bucket = storage.bucket(bucketName);

export async function uploadImageToGCS(
  file: File,
  folder: string = 'driver_images'
): Promise<string | null> {
  try {
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
    const urlParts = fileUrl.split('/');
    const fileName = urlParts.slice(-2).join('/'); // Get folder/filename
    
    await bucket.file(fileName).delete();
    return true;
  } catch (error) {
    console.error('Error deleting from GCS:', error);
    return false;
  }
}
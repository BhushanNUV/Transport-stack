const { Storage } = require('@google-cloud/storage');
const fs = require('fs');
const path = require('path');

async function testGCS() {
  try {
    console.log('Testing GCS connection...');
    
    // Read credentials
    const credentialsPath = path.join(__dirname, 'numeric-ocean-454912-f4-304bce751e9d.json');
    console.log('Looking for credentials at:', credentialsPath);
    
    if (!fs.existsSync(credentialsPath)) {
      console.error('Credentials file not found!');
      return;
    }
    
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    console.log('Project ID:', credentials.project_id);
    console.log('Client Email:', credentials.client_email);
    console.log('Private Key ID:', credentials.private_key_id);
    
    // Initialize storage
    const storage = new Storage({
      credentials: credentials,
      projectId: credentials.project_id,
    });
    
    const bucketName = 'driver-health-monitoring-images';
    const bucket = storage.bucket(bucketName);
    
    // Test bucket access
    console.log('\nTesting bucket access...');
    const [exists] = await bucket.exists();
    console.log('Bucket exists:', exists);
    
    if (exists) {
      // Try to list files
      const [files] = await bucket.getFiles({ maxResults: 5 });
      console.log('Files in bucket:', files.length);
      files.forEach(file => console.log(' -', file.name));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.code) console.error('Error code:', error.code);
    if (error.errors) console.error('Error details:', JSON.stringify(error.errors, null, 2));
  }
}

testGCS();
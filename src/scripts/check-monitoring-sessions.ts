import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkMonitoringSessions() {
  const targetDriverId = 'cmcykvi9h0001s3k1dn7umyj3';
  
  try {
    console.log('=== Checking Monitoring Sessions ===\n');
    
    // 1. Check if there are any records for the specific driver ID
    console.log(`1. Checking for sessions with driver ID: ${targetDriverId}`);
    const sessionsForDriver = await prisma.monitoringSession.findMany({
      where: {
        driverId: targetDriverId
      },
      select: {
        id: true,
        sessionId: true,
        driverId: true,
        status: true,
        startTime: true,
        endTime: true,
        totalImages: true,
        alcoholDetections: true,
        smokingDetections: true,
        behaviorDetections: true,
        alcohol_detected: true,
        drinking_detected: true,
        smoking_detected: true,
        drowsy_detected: true,
        sleeping_detected: true,
        mobile_use_detected: true,
        eating_detected: true,
        distracted_detected: true
      }
    });
    
    console.log(`Found ${sessionsForDriver.length} sessions for driver ${targetDriverId}`);
    if (sessionsForDriver.length > 0) {
      console.log('\nSessions found:');
      sessionsForDriver.forEach((session, index) => {
        console.log(`\nSession ${index + 1}:`);
        console.log(JSON.stringify(session, null, 2));
      });
    }
    
    // 2. Get total count of all monitoring sessions
    console.log('\n\n2. Total monitoring sessions in database:');
    const totalCount = await prisma.monitoringSession.count();
    console.log(`Total sessions: ${totalCount}`);
    
    // 3. Get a sample of monitoring sessions to see what driver IDs are stored
    console.log('\n\n3. Sample of monitoring sessions (first 10):');
    const sampleSessions = await prisma.monitoringSession.findMany({
      take: 10,
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        sessionId: true,
        driverId: true,
        status: true,
        startTime: true,
        totalImages: true,
        alcoholDetections: true,
        smokingDetections: true,
        behaviorDetections: true
      }
    });
    
    console.log('\nSample sessions:');
    sampleSessions.forEach((session, index) => {
      console.log(`\n${index + 1}. Session ${session.sessionId}:`);
      console.log(`   ID: ${session.id}`);
      console.log(`   Driver ID: ${session.driverId || 'NULL'}`);
      console.log(`   Status: ${session.status}`);
      console.log(`   Start Time: ${session.startTime}`);
      console.log(`   Total Images: ${session.totalImages}`);
      console.log(`   Detections - Alcohol: ${session.alcoholDetections}, Smoking: ${session.smokingDetections}, Behavior: ${session.behaviorDetections}`);
    });
    
    // 4. Get distribution of driver IDs in monitoring sessions
    console.log('\n\n4. Driver ID distribution in monitoring sessions:');
    const driverDistribution = await prisma.monitoringSession.groupBy({
      by: ['driverId'],
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    });
    
    console.log('\nDriver ID distribution:');
    driverDistribution.forEach((item) => {
      console.log(`   Driver ID: ${item.driverId || 'NULL'} - Count: ${item._count.id}`);
    });
    
    // 5. Check sessions with detections
    console.log('\n\n5. Sessions with any detections:');
    const sessionsWithDetections = await prisma.monitoringSession.findMany({
      where: {
        OR: [
          { alcohol_detected: 1 },
          { drinking_detected: 1 },
          { smoking_detected: 1 },
          { drowsy_detected: 1 },
          { sleeping_detected: 1 },
          { mobile_use_detected: 1 },
          { eating_detected: 1 },
          { distracted_detected: 1 }
        ]
      },
      select: {
        id: true,
        sessionId: true,
        driverId: true,
        alcohol_detected: true,
        drinking_detected: true,
        smoking_detected: true,
        drowsy_detected: true,
        sleeping_detected: true,
        mobile_use_detected: true,
        eating_detected: true,
        distracted_detected: true
      },
      take: 5
    });
    
    console.log(`\nFound ${sessionsWithDetections.length} sessions with detections (showing up to 5):`);
    sessionsWithDetections.forEach((session, index) => {
      console.log(`\n${index + 1}. Session ${session.sessionId}:`);
      console.log(`   Driver ID: ${session.driverId || 'NULL'}`);
      const detections = [];
      if (session.alcohol_detected) detections.push('Alcohol');
      if (session.drinking_detected) detections.push('Drinking');
      if (session.smoking_detected) detections.push('Smoking');
      if (session.drowsy_detected) detections.push('Drowsy');
      if (session.sleeping_detected) detections.push('Sleeping');
      if (session.mobile_use_detected) detections.push('Mobile Use');
      if (session.eating_detected) detections.push('Eating');
      if (session.distracted_detected) detections.push('Distracted');
      console.log(`   Detections: ${detections.join(', ')}`);
    });
    
    // 6. Raw SQL query for verification
    console.log('\n\n6. Raw SQL query verification:');
    const rawResults = await prisma.$queryRaw`
      SELECT id, sessionId, driverId, status, totalImages 
      FROM monitoring_sessions 
      WHERE driverId = ${targetDriverId}
      LIMIT 10
    `;
    console.log(`\nRaw SQL results for driver ${targetDriverId}:`, rawResults);
    
  } catch (error) {
    console.error('Error querying monitoring sessions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkMonitoringSessions();
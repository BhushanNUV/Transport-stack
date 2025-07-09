import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data
  console.log('🧹 Clearing existing data...');
  await prisma.systemAlert.deleteMany();
  await prisma.objectDetection.deleteMany();
  await prisma.alcoholDetection.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.healthReport.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.user.deleteMany();

  // Create admin user
  console.log('👤 Creating admin user...');
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@driverhealthsystem.com',
      name: 'System Administrator',
      role: 'ADMIN',
      password: await bcrypt.hash('password123', 12),
    },
  });

  // Create manager user
  const managerUser = await prisma.user.create({
    data: {
      email: 'manager@driverhealthsystem.com',
      name: 'Fleet Manager',
      role: 'MANAGER',
      password: await bcrypt.hash('password123', 12),
    },
  });

  // Create supervisor user
  const supervisorUser = await prisma.user.create({
    data: {
      email: 'supervisor@driverhealthsystem.com',
      name: 'Health Supervisor',
      role: 'SUPERVISOR',
      password: await bcrypt.hash('password123', 12),
    },
  });

  console.log('✅ Created 3 users');

  // Create drivers
  console.log('🚗 Creating drivers...');
  const drivers = [];
  const genders = ['MALE', 'FEMALE', 'OTHER'] as const;
  
  for (let i = 1; i <= 25; i++) {
    const gender = faker.helpers.arrayElement(genders);
    const firstName = faker.person.firstName(gender === 'OTHER' ? undefined : gender.toLowerCase() as 'male' | 'female');
    const lastName = faker.person.lastName();
    const email = faker.internet.email({ firstName, lastName }).toLowerCase();
    const dateOfBirth = faker.date.birthdate({ min: 25, max: 65, mode: 'age' });
    const age = new Date().getFullYear() - dateOfBirth.getFullYear();

    const driver = await prisma.driver.create({
      data: {
        driverId: `DRV-${String(i).padStart(3, '0')}`,
        name: `${firstName} ${lastName}`,
        email,
        phone: faker.phone.number(),
        age,
        gender,
        address: faker.location.streetAddress({ useFullAddress: true }),
        dateOfBirth,
        weight: faker.number.float({ min: 50, max: 120, multipleOf: 0.1 }),
        height: faker.number.float({ min: 150, max: 200, multipleOf: 0.1 }),
      },
    });

    drivers.push(driver);
  }

  console.log(`✅ Created ${drivers.length} drivers`);

  // Create health reports
  console.log('📊 Creating health reports...');
  const stressLevels = ['LOW', 'NORMAL', 'MILD', 'HIGH', 'VERY_HIGH'] as const;
  const riskLevels = ['NORMAL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
  let healthReportsCount = 0;

  for (const driver of drivers) {
    // Create 3-8 health reports per driver (historical data)
    const reportsCount = faker.number.int({ min: 3, max: 8 });
    
    for (let j = 0; j < reportsCount; j++) {
      const reportDate = faker.date.recent({ days: 90 });
      const bloodPressureHigh = faker.number.int({ min: 100, max: 180 });
      const bloodPressureLow = faker.number.int({ min: 60, max: 110 });
      const heartRate = faker.number.int({ min: 50, max: 120 });
      const stressLevel = faker.helpers.arrayElement(stressLevels);
      
      // Determine risk level based on health metrics
      let riskLevel: typeof riskLevels[number] = 'NORMAL';
      
      if (bloodPressureHigh >= 160 || bloodPressureLow >= 100 || heartRate > 110 || stressLevel === 'VERY_HIGH') {
        riskLevel = 'CRITICAL';
      } else if (bloodPressureHigh >= 140 || bloodPressureLow >= 90 || heartRate > 100 || stressLevel === 'HIGH') {
        riskLevel = 'HIGH';
      } else if (bloodPressureHigh >= 130 || bloodPressureLow >= 80 || heartRate > 90 || stressLevel === 'MILD') {
        riskLevel = 'MEDIUM';
      } else if (bloodPressureHigh >= 120 || bloodPressureLow >= 70 || heartRate > 80) {
        riskLevel = 'LOW';
      }

      await prisma.healthReport.create({
        data: {
          driverId: driver.id,
          reportDate,
          bloodPressureHigh,
          bloodPressureLow,
          heartRate,
          stressLevel,
          riskLevel,
          notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.3 }),
        },
      });

      healthReportsCount++;
    }
  }

  console.log(`✅ Created ${healthReportsCount} health reports`);

  // Create attendance records
  console.log('📅 Creating attendance records...');
  const attendanceStatuses = ['PRESENT', 'ABSENT', 'LATE', 'EARLY_LEAVE', 'HALF_DAY'] as const;
  let attendanceCount = 0;

  for (const driver of drivers) {
    // Create attendance records for the last 30 days
    for (let day = 30; day >= 0; day--) {
      const date = new Date();
      date.setDate(date.getDate() - day);
      date.setHours(0, 0, 0, 0);
      
      // Skip weekends for most drivers
      if (date.getDay() === 0 || date.getDay() === 6) {
        if (faker.datatype.boolean({ probability: 0.2 })) continue; // 80% skip weekends
      }

      const status = faker.helpers.weightedArrayElement([
        { weight: 80, value: 'PRESENT' },
        { weight: 5, value: 'ABSENT' },
        { weight: 10, value: 'LATE' },
        { weight: 3, value: 'EARLY_LEAVE' },
        { weight: 2, value: 'HALF_DAY' },
      ]);

      let checkInTime: Date | null = null;
      let checkOutTime: Date | null = null;
      let workingHours: number | null = null;

      if (status !== 'ABSENT') {
        const baseCheckIn = new Date(date);
        baseCheckIn.setHours(8, 0, 0, 0); // 8:00 AM base time

        if (status === 'LATE') {
          checkInTime = new Date(baseCheckIn.getTime() + faker.number.int({ min: 15, max: 120 }) * 60 * 1000);
        } else {
          checkInTime = new Date(baseCheckIn.getTime() + faker.number.int({ min: -30, max: 30 }) * 60 * 1000);
        }

        const baseCheckOut = new Date(date);
        baseCheckOut.setHours(17, 0, 0, 0); // 5:00 PM base time

        if (status === 'EARLY_LEAVE') {
          checkOutTime = new Date(baseCheckOut.getTime() - faker.number.int({ min: 30, max: 180 }) * 60 * 1000);
        } else if (status === 'HALF_DAY') {
          checkOutTime = new Date(baseCheckOut.getTime() - faker.number.int({ min: 240, max: 300 }) * 60 * 1000);
        } else {
          checkOutTime = new Date(baseCheckOut.getTime() + faker.number.int({ min: -60, max: 120 }) * 60 * 1000);
        }

        workingHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
      }

      await prisma.attendanceRecord.create({
        data: {
          driverId: driver.id,
          date,
          checkInTime,
          checkOutTime,
          workingHours,
          status,
          location: faker.helpers.maybe(() => faker.location.city(), { probability: 0.7 }),
          notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.2 }),
        },
      });

      attendanceCount++;
    }
  }

  console.log(`✅ Created ${attendanceCount} attendance records`);

  // Create alcohol detections
  console.log('🍺 Creating alcohol detections...');
  const detectionSeverities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
  let alcoholDetectionsCount = 0;

  for (const driver of drivers) {
    // 30% chance of having alcohol detections
    if (faker.datatype.boolean({ probability: 0.3 })) {
      const detectionsCount = faker.number.int({ min: 1, max: 5 });
      
      for (let j = 0; j < detectionsCount; j++) {
        const detectedAt = faker.date.recent({ days: 30 });
        const confidence = faker.number.float({ min: 0.6, max: 0.98 });
        const severity = faker.helpers.weightedArrayElement([
          { weight: 40, value: 'LOW' },
          { weight: 35, value: 'MEDIUM' },
          { weight: 20, value: 'HIGH' },
          { weight: 5, value: 'CRITICAL' },
        ]);

        await prisma.alcoholDetection.create({
          data: {
            driverId: driver.id,
            detectedAt,
            confidence,
            imageUrl: faker.helpers.maybe(() => `https://picsum.photos/400/300?random=${Math.floor(Math.random() * 1000)}`, { probability: 0.8 }),
            location: faker.location.streetAddress(),
            severity,
            notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.4 }),
          },
        });

        alcoholDetectionsCount++;
      }
    }
  }

  console.log(`✅ Created ${alcoholDetectionsCount} alcohol detections`);

  // Create object detections
  console.log('📱 Creating object detections...');
  const objectTypes = ['phone', 'food', 'drink', 'cigarette', 'book', 'tablet', 'coffee', 'sandwich'];
  let objectDetectionsCount = 0;

  for (const driver of drivers) {
    // 60% chance of having object detections
    if (faker.datatype.boolean({ probability: 0.6 })) {
      const detectionsCount = faker.number.int({ min: 1, max: 10 });
      
      for (let j = 0; j < detectionsCount; j++) {
        const detectedAt = faker.date.recent({ days: 30 });
        const objectType = faker.helpers.arrayElement(objectTypes);
        const confidence = faker.number.float({ min: 0.7, max: 0.99 });
        
        // Phone usage is generally higher severity
        const severity = objectType === 'phone' 
          ? faker.helpers.arrayElement(['MEDIUM', 'HIGH', 'CRITICAL'])
          : faker.helpers.arrayElement(['LOW', 'MEDIUM', 'HIGH']);

        await prisma.objectDetection.create({
          data: {
            driverId: driver.id,
            detectedAt,
            objectType,
            confidence,
            imageUrl: faker.helpers.maybe(() => `https://picsum.photos/400/300?random=${Math.floor(Math.random() * 1000)}`, { probability: 0.7 }),
            location: faker.location.streetAddress(),
            severity,
            notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.3 }),
          },
        });

        objectDetectionsCount++;
      }
    }
  }

  console.log(`✅ Created ${objectDetectionsCount} object detections`);

  // Create system alerts
  console.log('🚨 Creating system alerts...');
  const alertTypes = ['HEALTH', 'ATTENDANCE', 'ALCOHOL_DETECTION', 'OBJECT_DETECTION', 'SYSTEM', 'SAFETY'] as const;
  const alertSeverities = ['INFO', 'WARNING', 'ERROR', 'CRITICAL'] as const;
  const userRoles = ['ADMIN', 'MANAGER', 'SUPERVISOR'] as const;

  const alertTemplates = [
    { type: 'HEALTH', title: 'High Blood Pressure Alert', message: 'Driver {driver} has recorded elevated blood pressure levels', severity: 'ERROR' },
    { type: 'HEALTH', title: 'Critical Heart Rate', message: 'Driver {driver} has abnormal heart rate readings', severity: 'CRITICAL' },
    { type: 'HEALTH', title: 'High Stress Level', message: 'Driver {driver} is showing high stress indicators', severity: 'WARNING' },
    { type: 'ATTENDANCE', title: 'Late Check-in', message: 'Driver {driver} checked in late for duty', severity: 'INFO' },
    { type: 'ATTENDANCE', title: 'Missed Check-out', message: 'Driver {driver} failed to check out', severity: 'WARNING' },
    { type: 'ALCOHOL_DETECTION', title: 'Alcohol Detection Alert', message: 'Possible alcohol detected for driver {driver}', severity: 'CRITICAL' },
    { type: 'OBJECT_DETECTION', title: 'Phone Usage Detected', message: 'Driver {driver} detected using phone while driving', severity: 'WARNING' },
    { type: 'OBJECT_DETECTION', title: 'Distracted Driving', message: 'Driver {driver} detected eating/drinking while driving', severity: 'WARNING' },
    { type: 'SAFETY', title: 'Emergency Brake Event', message: 'Driver {driver} triggered emergency braking system', severity: 'ERROR' },
    { type: 'SYSTEM', title: 'System Maintenance', message: 'Scheduled maintenance window starting soon', severity: 'INFO' },
    { type: 'SYSTEM', title: 'Database Backup', message: 'Daily database backup completed successfully', severity: 'INFO' },
  ];

  for (let i = 0; i < 50; i++) {
    const template = faker.helpers.arrayElement(alertTemplates);
    const driver = faker.helpers.arrayElement(drivers);
    const createdAt = faker.date.recent({ days: 7 });
    
    let message = template.message;
    if (message.includes('{driver}')) {
      message = message.replace('{driver}', `${driver.name} (${driver.driverId})`);
    }

    await prisma.systemAlert.create({
      data: {
        title: template.title,
        message,
        type: template.type,
        severity: template.severity as typeof alertSeverities[number],
        isRead: faker.datatype.boolean({ probability: 0.6 }),
        targetRole: faker.helpers.maybe(() => faker.helpers.arrayElement(userRoles), { probability: 0.3 }),
        createdAt,
        updatedAt: createdAt,
      },
    });
  }

  console.log('✅ Created 50 system alerts');

  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`   👤 Users: 3`);
  console.log(`   🚗 Drivers: ${drivers.length}`);
  console.log(`   📊 Health Reports: ${healthReportsCount}`);
  console.log(`   📅 Attendance Records: ${attendanceCount}`);
  console.log(`   🍺 Alcohol Detections: ${alcoholDetectionsCount}`);
  console.log(`   📱 Object Detections: ${objectDetectionsCount}`);
  console.log(`   🚨 System Alerts: 50`);
  console.log('\n🔐 Login Credentials:');
  console.log('   Admin: admin@driverhealthsystem.com / password123');
  console.log('   Manager: manager@driverhealthsystem.com / password123');
  console.log('   Supervisor: supervisor@driverhealthsystem.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
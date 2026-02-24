const mongoose = require('mongoose');
const config = require('../config');
const { seedAdmin, seedSecondAdmin } = require('./adminSeed');

const runSeeds = async () => {
  try {
    console.log('🌱 Starting database seeding...\n');

    // Connect to MongoDB
    await mongoose.connect(config.mongodbUri);
    console.log('✅ Connected to MongoDB\n');

    // Run seeds
    console.log('--- Seeding Admins ---');
    await seedAdmin();
    await seedSecondAdmin();

    console.log('\n🎉 Seeding completed successfully!\n');
    console.log('--- Admin Credentials ---');
    console.log('Admin 1:');
    console.log('  Email: admin@jainpathshala.com');
    console.log('  Password: admin123');
    console.log('\nAdmin 2:');
    console.log('  Email: admin2@jainpathshala.com');
    console.log('  Password: admin123');
    console.log('\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
};

runSeeds();
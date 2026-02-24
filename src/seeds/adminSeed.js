const mongoose = require('mongoose');
const { Admin } = require('../models');
const config = require('../config');

const seedAdmin = async () => {
  try {
    // Delete existing admins first
    await Admin.deleteMany({});
    console.log('🗑️  Cleared existing admins');

    // Create super admin
    const admin = await Admin.create({
      name: 'admin',
      email: 'admin@jainpathshala.com',
      password: 'admin123', // Plain text password
      role: 'super_admin',
      isActive: true
    });

    console.log('✅ Super Admin created:');
    console.log('   Name: admin');
    console.log('   Password: admin123');

    return admin;
  } catch (error) {
    console.error('❌ Error seeding admin:', error.message);
    throw error;
  }
};

const seedSecondAdmin = async () => {
  try {
    const admin = await Admin.create({
      name: 'admin2',
      email: 'admin2@jainpathshala.com',
      password: 'admin123', // Plain text password
      role: 'admin',
      isActive: true
    });

    console.log('✅ Second Admin created:');
    console.log('   Name: admin2');
    console.log('   Password: admin123');

    return admin;
  } catch (error) {
    console.error('❌ Error seeding second admin:', error.message);
    throw error;
  }
};

module.exports = {
  seedAdmin,
  seedSecondAdmin
};
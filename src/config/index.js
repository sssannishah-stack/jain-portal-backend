require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/jain-pathshala',
  jwtSecret: process.env.JWT_SECRET || 'default-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  admin: {
    name: process.env.ADMIN_NAME || 'admin',
    email: process.env.ADMIN_EMAIL || 'admin@jainpathshala.com',
    password: process.env.ADMIN_PASSWORD || 'admin123'
  }
};
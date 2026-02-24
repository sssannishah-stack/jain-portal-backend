const mongoose = require('mongoose');
const config = require('./index');

// Cache the connection for Vercel serverless environment
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  // Return cached connection if already connected
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    };

    cached.promise = mongoose.connect(config.mongodbUri, opts).then((mongoose) => {
      console.log(`✅ MongoDB Connected`);
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    console.error('❌ MongoDB Connection Error:', error.message);
    throw error;
  }

  return cached.conn;
};

module.exports = connectDB;
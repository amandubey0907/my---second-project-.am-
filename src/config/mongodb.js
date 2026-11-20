// ============================================
// NexusFlow - MongoDB Connection Config
// ============================================

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexusflow';

let isConnected = false;

const connectMongoDB = async () => {
  if (isConnected) return;

  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log('[MongoDB] ✅ Connected to:', MONGODB_URI);
  } catch (error) {
    console.warn('[MongoDB] ⚠️  Could not connect (running in demo mode):', error.message);
  }
};

const getMongoStats = async () => {
  if (!isConnected || !mongoose.connection.db) {
    return { status: 'disconnected', collections: 0, documents: 0 };
  }
  try {
    const admin = mongoose.connection.db.admin();
    const dbStats = await mongoose.connection.db.stats();
    return {
      status: 'connected',
      database: mongoose.connection.name,
      collections: dbStats.collections,
      documents: dbStats.objects,
      dataSize: `${(dbStats.dataSize / 1024).toFixed(2)} KB`,
      storageSize: `${(dbStats.storageSize / 1024).toFixed(2)} KB`,
    };
  } catch (err) {
    return { status: 'error', message: err.message };
  }
};

module.exports = { connectMongoDB, getMongoStats, mongoose };

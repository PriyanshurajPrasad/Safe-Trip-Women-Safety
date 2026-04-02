const mongoose = require('mongoose');

/**
 * Database connection configuration
 * Establishes connection to MongoDB with proper error handling
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error.message);
    process.exit(1);
  }
};

/**
 * Graceful database disconnection
 */
const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  } catch (error) {
    console.error('Database disconnection error:', error.message);
  }
};

module.exports = {
  connectDB,
  disconnectDB
};

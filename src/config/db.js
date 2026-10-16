const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

// Reject filter keys that are not in the schema, and wrap any `$`-operator objects that
// arrive inside filter values in `$eq` (defense in depth against NoSQL operator injection).
mongoose.set('strictQuery', true);
mongoose.set('sanitizeFilter', true);

mongoose.connection.on('connected', () => {
  logger.info('MongoDB connected', {
    database: mongoose.connection.name,
    host: mongoose.connection.host,
  });
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  logger.error('MongoDB connection error', { error: err.message });
});

async function connectDB() {
  // dbName forces the required database name even if the URI points elsewhere.
  await mongoose.connect(env.mongodbUri, {
    dbName: env.dbName,
    serverSelectionTimeoutMS: 10000,
  });

  // Make sure unique indexes exist before the API starts accepting requests.
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
}

async function disconnectDB() {
  await mongoose.connection.close();
}

module.exports = { connectDB, disconnectDB };

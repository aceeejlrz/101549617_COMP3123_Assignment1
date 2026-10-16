const mongoose = require('mongoose');
const env = require('../config/env');
const { version } = require('../../package.json');

const DB_STATES = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

// GET /health - lets anyone check that the API process (and its database) is up.
function getHealth(req, res) {
  const dbState = DB_STATES[mongoose.connection.readyState] || 'unknown';

  res.status(200).json({
    status: dbState === 'connected' ? 'ok' : 'degraded',
    message: 'COMP3123 Assignment 1 API is running',
    version,
    environment: env.nodeEnv,
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.round(process.uptime()),
    database: {
      status: dbState,
      name: env.dbName,
    },
  });
}

module.exports = { getHealth };

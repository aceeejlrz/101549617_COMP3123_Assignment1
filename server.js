const env = require('./src/config/env');
const logger = require('./src/utils/logger');
const app = require('./src/app');
const { connectDB, disconnectDB } = require('./src/config/db');

// Give the file transports a moment to flush before the process exits.
function exitProcess(code) {
  process.exitCode = code;
  setTimeout(() => process.exit(code), 500).unref();
}

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', {
    error: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception - shutting down', { error: err.message, stack: err.stack });
  exitProcess(1);
});

async function start() {
  try {
    await connectDB();

    const server = app.listen(env.port, () => {
      logger.info(`Server started on http://localhost:${env.port}`, {
        port: env.port,
        environment: env.nodeEnv,
        database: env.dbName,
      });
    });

    const shutdown = (signal) => {
      logger.info(`${signal} received - shutting down gracefully`);
      server.close(async () => {
        await disconnectDB();
        logger.info('Server stopped');
        exitProcess(0);
      });
      // Force exit if open connections keep the server alive.
      setTimeout(() => process.exit(1), 10000).unref();
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    logger.error('Failed to start server', { error: err.message });
    exitProcess(1);
  }
}

start();

const mongoose = require('mongoose');
const env = require('./config/env');
const app = require('./app');
const connectDB = require('./config/db');

let server;

async function shutdown(signal) {
  console.log(`${signal} received, shutting down...`);
  // stop taking new requests, finish current ones, then close the database
  server.close(async () => {
    await mongoose.connection.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref(); // do not hang forever
}

(async () => {
  await connectDB();
  server = app.listen(env.port, () => console.log(`Server running on port ${env.port} (${env.nodeEnv})`));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
})().catch((err) => {
  console.error('Failed to start:', err.message);
  process.exit(1);
});

process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', err));

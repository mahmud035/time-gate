import type { Server } from 'node:http';
import mongoose from 'mongoose';
import app from './app.js';
import { config } from './config/index.js';

let server: Server | undefined;

const start = async (): Promise<void> => {
  await mongoose.connect(config.MONGODB_URI, { dbName: config.MONGODB_DB });
  console.log(`Connected to MongoDB database "${config.MONGODB_DB}"`);

  server = app.listen(config.PORT, () => {
    console.log(`TimeGate API listening on port ${config.PORT}`);
  });
};

/** Railway sends SIGTERM on redeploy; close cleanly so no request is cut off. */
const shutdown = (signal: string): void => {
  console.log(`${signal} received, shutting down`);

  const closeDb = (): void => {
    void mongoose.connection.close(false).finally(() => process.exit(0));
  };

  if (server) {
    server.close(closeDb);
  } else {
    closeDb();
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  shutdown('unhandledRejection');
});

start().catch((error: unknown) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

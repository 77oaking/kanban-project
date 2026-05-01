import 'dotenv/config';
import http from 'http';
import { app } from './app.js';
import { initSocket } from './realtime/socket.js';
import { logger } from './lib/logger.js';

const PORT = Number(process.env.PORT) || 4000;

const server = http.createServer(app);
initSocket(server);

server.listen(PORT, () => {
  logger.info(`API listening on :${PORT}`);
  logger.info(`Swagger docs: http://localhost:${PORT}/api/docs`);
});

const shutdown = (signal) => {
  logger.info(`${signal} received, shutting down…`);
  server.close(() => process.exit(0));
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

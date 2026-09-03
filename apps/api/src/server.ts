import 'dotenv/config';
import { app } from './app.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';

const PORT = parseInt(process.env.PORT || '8000', 10);

async function startServer() {
  try {
    await prisma.$connect();
    logger.info('Connected to PostgreSQL database via Prisma');

    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`EVOLIX School ERP API listening on http://0.0.0.0:${PORT}`);
    });

    const shutdown = async () => {
      logger.info('Shutting down API server...');
      server.close(async () => {
        await prisma.$disconnect();
        logger.info('Prisma disconnected, server exited.');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    logger.error({ err }, 'Failed to start API server');
    process.exit(1);
  }
}

startServer();

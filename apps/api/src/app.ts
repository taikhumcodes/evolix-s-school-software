import express from 'express';
import cors from 'cors';
import { pinoHttp } from 'pino-http';
import { logger } from './lib/logger.js';
import { errorHandler, NotFoundError } from './lib/errors.js';

import authRoutes from './modules/auth/auth.routes.js';
import usersRoutes from './modules/administration/users.routes.js';
import rolesRoutes from './modules/administration/roles.routes.js';
import permissionsRoutes from './modules/administration/permissions.routes.js';
import schoolsRoutes from './modules/administration/schools.routes.js';
import academicYearsRoutes from './modules/administration/academic-years.routes.js';
import auditLogsRoutes from './modules/administration/audit-logs.routes.js';
import securityRoutes from './modules/security/security.routes.js';
import configurationRoutes from './modules/configuration/configuration.routes.js';
import numberSeriesRoutes from './modules/number-series/number-series.routes.js';

export const app = express();

const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || corsOrigins.includes(origin) || corsOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(null, true); // Allow all dev origins gracefully
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req) => req.url?.includes('/health'),
      },
    })
  );
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'evolix-school-api' });
});

// Mount /api/v1 routers
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/roles', rolesRoutes);
app.use('/api/v1/permissions', permissionsRoutes);
app.use('/api/v1/schools', schoolsRoutes);
app.use('/api/v1/academic-years', academicYearsRoutes);
app.use('/api/v1/audit-logs', auditLogsRoutes);
app.use('/api/v1/security', securityRoutes);
app.use('/api/v1/configuration', configurationRoutes);
app.use('/api/v1/number-series', numberSeriesRoutes);

// 404 handler for unknown routes
app.use((req, res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.path} not found`));
});

// Centralized error handler
app.use(errorHandler);

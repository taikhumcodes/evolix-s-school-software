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
import masterDataRoutes from './modules/master-data/master-data.routes.js';
import setupRoutes from './modules/setup/setup.routes.js';
import searchRoutes from './modules/search/search.routes.js';
import admissionsRoutes from './modules/admissions/admissions.routes.js';
import studentsRoutes from './modules/students/students.routes.js';
import guardiansRoutes from './modules/guardians/guardians.routes.js';
import familiesRoutes from './modules/families/families.routes.js';
import {
  attendanceRouter,
  studentLeaveRouter,
  staffAttendanceRouter,
  staffLeaveRouter,
  holidaysRouter,
} from './modules/attendance/attendance.routes.js';
import {
  academicsRouter,
  academicTermsRouter,
  academicAssignmentsRouter,
  periodsRouter,
  timetableRouter,
  homeworkRouter,
  examsRouter,
  marksRouter,
  resultsRouter,
  promotionsRouter,
} from './modules/academics/academics.routes.js';
import financeRouter from './modules/finance/finance.routes.js';
import hrRouter from './modules/hr/hr.routes.js';
import payrollRouter from './modules/hr/payroll.routes.js';
import { operationsRouter } from './modules/operations/operations.routes.js';
import { communicationRouter, automationRouter } from './modules/communication/communication.routes.js';

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
app.use('/api/v1/master-data', masterDataRoutes);
app.use('/api/v1/setup', setupRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/admissions', admissionsRoutes);
app.use('/api/v1/students', studentsRoutes);
app.use('/api/v1/guardians', guardiansRoutes);
app.use('/api/v1/families', familiesRoutes);
app.use('/api/v1/attendance', attendanceRouter);
app.use('/api/v1/student-leave', studentLeaveRouter);
app.use('/api/v1/staff-attendance', staffAttendanceRouter);
app.use('/api/v1/staff-leave', staffLeaveRouter);
app.use('/api/v1/holidays', holidaysRouter);
app.use('/api/v1/academics', academicsRouter);
app.use('/api/v1/academic-terms', academicTermsRouter);
app.use('/api/v1/academic-assignments', academicAssignmentsRouter);
app.use('/api/v1/periods', periodsRouter);
app.use('/api/v1/timetable', timetableRouter);
app.use('/api/v1/homework', homeworkRouter);
app.use('/api/v1/exams', examsRouter);
app.use('/api/v1/marks', marksRouter);
app.use('/api/v1/results', resultsRouter);
app.use('/api/v1/promotions', promotionsRouter);
app.use('/api/v1/finance', financeRouter);
app.use('/api/v1/hr', hrRouter);
app.use('/api/v1/payroll', payrollRouter);
app.use('/api/v1/operations', operationsRouter);
app.use('/api/v1/communication', communicationRouter);
app.use('/api/v1/automation', automationRouter);

// 404 handler for unknown routes
app.use((req, res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.path} not found`));
});

// Centralized error handler
app.use(errorHandler);

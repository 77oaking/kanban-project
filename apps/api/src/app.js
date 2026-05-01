import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';

import { swaggerSpec } from './lib/swagger.js';
import { errorHandler } from './middleware/error.js';
import authRoutes from './routes/auth.js';
import workspaceRoutes from './routes/workspaces.js';
import memberRoutes from './routes/members.js';
import goalRoutes from './routes/goals.js';
import announcementRoutes from './routes/announcements.js';
import actionItemRoutes from './routes/actionItems.js';
import notificationRoutes from './routes/notifications.js';
import statsRoutes from './routes/stats.js';
import exportRoutes from './routes/export.js';
import uploadRoutes from './routes/upload.js';
import invitationRoutes from './routes/invitations.js';

export const app = express();

const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: clientUrl.split(',').map((s) => s.trim()),
    credentials: true,
  }),
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Basic rate limiter on auth endpoints to soften brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
});

// --- Health
app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

// --- Swagger
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));
app.get('/api/openapi.json', (_req, res) => res.json(swaggerSpec));

// --- Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/workspaces/:workspaceId/members', memberRoutes);
app.use('/api/workspaces/:workspaceId/goals', goalRoutes);
app.use('/api/workspaces/:workspaceId/announcements', announcementRoutes);
app.use('/api/workspaces/:workspaceId/action-items', actionItemRoutes);
app.use('/api/workspaces/:workspaceId/stats', statsRoutes);
app.use('/api/workspaces/:workspaceId/export', exportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/invitations', invitationRoutes);

// --- 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// --- Error handler
app.use(errorHandler);

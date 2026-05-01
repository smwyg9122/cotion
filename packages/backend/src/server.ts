import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { testConnection } from './database/connection';
import { errorHandler } from './middleware/error.middleware';
import authRoutes from './routes/auth.routes';
import pagesRoutes from './routes/pages.routes';
import filesRoutes from './routes/files.routes';
import notificationsRoutes from './routes/notifications.routes';
import commentsRoutes from './routes/comments.routes';
import calendarRoutes from './routes/calendar.routes';
import clientsRoutes from './routes/clients.routes';
import inventoryRoutes from './routes/inventory.routes';
import projectsRoutes from './routes/projects.routes';
import cuppingRoutes from './routes/cupping.routes';
import documentsRoutes from './routes/documents.routes';
import kakaoRoutes from './routes/kakao.routes';
import adminRoutes from './routes/admin.routes';
import { initializeWebSocketServer } from './websocket/collaboration.handler';
import { SchedulerService } from './services/scheduler.service';

const app = express();

// Trust proxy (Railway, Heroku, etc.)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors(config.cors));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/pages', pagesRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/cupping-logs', cuppingRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/kakao', kakaoRoutes);
app.use('/api/admin', adminRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

async function startServer() {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('Failed to connect to database. Exiting...');
      process.exit(1);
    }

    // Run pending migrations
    try {
      const { db } = await import('./database/connection');
      const [batch, migrations] = await db.migrate.latest();
      if (migrations.length > 0) {
        console.log(`✅ Ran ${migrations.length} migrations (batch ${batch})`);
      } else {
        console.log('✅ Database migrations up to date');
      }
    } catch (migrationError) {
      console.error('⚠️ Migration failed (server will continue):', migrationError);
    }

    // Initialize scheduled jobs (meeting templates, followup notifications)
    SchedulerService.init();

    // Create HTTP server
    const server = http.createServer(app);

    // Initialize WebSocket server for collaboration
    initializeWebSocketServer(server);

    // Start HTTP server
    server.listen(config.port, () => {
      console.log(`🚀 Server running on http://localhost:${config.port}`);
      console.log(`📝 Environment: ${config.nodeEnv}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
  process.exit(1);
});

startServer();

export default app;

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
import ayutaBuyersRoutes from './routes/ayuta-buyers.routes';
import priceItemsRoutes from './routes/price-items.routes';
import kakaoRoutes from './routes/kakao.routes';
import adminRoutes from './routes/admin.routes';
import { initializeWebSocketServer } from './websocket/collaboration.handler';
import { SchedulerService } from './services/scheduler.service';

const app = express();

// Captures the most recent migration failure (if any) so /health/schema
// can report WHY the schema is stale, not just that it is.
let lastMigrationError: string | null = null;

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

// Schema health — lists every column the latest code reads or writes so
// we can confirm production migrations are caught up. Returns
// { ok: true, missing: [] } when fresh, or { ok, missing: [...] } when
// stale (HTTP 503 so a smoke test can fail loudly).
//
// Coverage is exhaustive for the recently-enriched tables (clients,
// ayuta_buyers) plus the auth fields the rest of the app depends on.
// When a new column is added in a migration, append it here too.
app.get('/health/schema', async (req, res) => {
  try {
    const { db } = await import('./database/connection');
    const expected: Array<[string, string]> = [
      // ─── clients (every column current code writes — see clients.service.create) ───
      ['clients', 'kakao_id'],
      ['clients', 'instagram'],
      ['clients', 'region'],
      ['clients', 'business_type'],
      ['clients', 'status'],
      ['clients', 'follow_up_date'],
      ['clients', 'first_order_date'],
      ['clients', 'last_order_date'],
      ['clients', 'total_order_amount'],
      ['clients', 'monthly_volume_kg'],
      ['clients', 'preferred_items'],
      ['clients', 'tax_id'],
      ['clients', 'invoice_email'],
      ['clients', 'payment_terms'],
      ['clients', 'shipping_address'],
      // ─── ayuta_buyers (거래처 통합 흡수 필드 포함) ───
      ['ayuta_buyers', 'company_name'],
      ['ayuta_buyers', 'interest_items'],
      ['ayuta_buyers', 'follow_up_date'],
      ['ayuta_buyers', 'interest_level'],
      ['ayuta_buyers', 'assigned_to'],
      ['ayuta_buyers', 'tax_id'],
      ['ayuta_buyers', 'payment_terms'],
      ['ayuta_buyers', 'monthly_volume_kg'],
      ['cupping_logs', 'buyer_id'],
      // ─── price_items ───
      ['price_items', 'product_name'],
      ['price_items', 'channel'],
      ['price_items', 'price'],
      // ─── auth-related ───
      ['users', 'is_active'],
      ['users', 'allowed_workspaces'],
      ['sessions', 'refresh_token'],
    ];
    const missing: string[] = [];
    for (const [table, column] of expected) {
      const ok = await db.schema.hasColumn(table, column);
      if (!ok) missing.push(`${table}.${column}`);
    }
    res.status(missing.length ? 503 : 200).json({
      ok: missing.length === 0,
      missing,
      checkedColumns: expected.length,
      lastMigrationError,
      checkedAt: new Date().toISOString(),
    });
  } catch (e) {
    // Don't leak DB internals (connection strings, library stack); a
    // sanitized message is enough for ops to know the check itself broke.
    console.error('/health/schema failed:', e);
    res.status(500).json({ ok: false, error: 'schema check failed' });
  }
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
app.use('/api/ayuta-buyers', ayutaBuyersRoutes);
app.use('/api/price-items', priceItemsRoutes);
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

    // Run pending migrations.
    //
    // Default behavior: log the failure but KEEP BOOTING. A migration that
    // throws must NOT take the whole app offline — that turns a "writes
    // 500" problem into a "nothing works + Railway healthcheck fails +
    // can't even deploy the fix" deadlock (which is exactly what happened
    // once we made it fatal). Reads still work; the failed migration is
    // recorded and surfaced via /health/schema and the startup log.
    //
    // Opt-in strict mode: set MIGRATIONS_FATAL=1 to exit on failure. Only
    // use in environments where a broken schema should block the rollout
    // AND you have a way to recover (manual migrate, rollback).
    try {
      const { db } = await import('./database/connection');
      const [batch, migrations] = await db.migrate.latest();
      if (migrations.length > 0) {
        console.log(`✅ Ran ${migrations.length} migrations (batch ${batch})`);
      } else {
        console.log('✅ Database migrations up to date');
      }
    } catch (migrationError) {
      const err = migrationError as Error;
      lastMigrationError = err.message;
      console.error('❌ Migration failed (server will still start):');
      console.error('   message:', err.message);
      console.error('   stack:', err.stack);
      console.error('   → Check GET /health/schema to see which columns are missing.');
      if (process.env.MIGRATIONS_FATAL === '1') {
        console.error('   MIGRATIONS_FATAL=1 set — exiting.');
        process.exit(1);
      }
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

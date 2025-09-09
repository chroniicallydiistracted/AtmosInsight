import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { PORTS } from '@atmos/shared-utils';
import { createS3Router } from './routes/s3.js';
import { createApiRouter } from './routes/api.js';
import { createHealthRouter } from './routes/health.js';
import { errorHandler } from './middleware/errorHandler.js';
import { costTracking } from './middleware/costTracking.js';

const app = express();
const port = PORTS.PROXY || 3000;

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"],
      fontSrc: ["'self'"],
    }
  }
}));

// CORS configuration - restrictive in development, configurable for production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3002']
    : true,
  credentials: true,
  methods: ['GET', 'HEAD', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with'],
  exposedHeaders: ['x-cost-note', 'x-provider-id', 'cache-control']
};

app.use(cors(corsOptions));
app.use(compression());
app.use(morgan('combined'));

// Cost tracking middleware
app.use(costTracking);

// Routes
app.use('/health', createHealthRouter());
app.use('/api/s3', createS3Router());
app.use('/api', createApiRouter());

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    availableRoutes: [
      'GET /health',
      'GET /api/s3/:provider/*',
      'GET /api/gibs/*',
      'GET /api/air/airnow/*',
      'GET /api/air/openaq/*',
      'GET /api/point/metno',
      'GET /api/space/*',
      'GET /api/basemap/*',
      'GET /api/owm/*'
    ]
  });
});

const server = app.listen(port, () => {
  console.log(`🌍 AtmosInsight Proxy Server running on port ${port}`);
  console.log(`📍 Health check: http://localhost:${port}/health`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  if (process.env.NODE_ENV !== 'production') {
    console.log(`🎯 Frontend URL: http://localhost:${PORTS.WEB || 3002}`);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

export default app;

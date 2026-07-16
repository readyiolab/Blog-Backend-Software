require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

// Import routes
const articleRoutes = require('./routes/article_routes');
const authRoutes = require('./routes/auth_routes');
const categoryRoutes = require('./routes/category_routes');
const userRoutes = require('./routes/user_routes');
const adminRoutes = require('./routes/admin_routes');
const commentRoutes = require('./routes/comment_routes');
const newsLetterRoutes = require('./routes/newsletter_routes');
const sitemapRoutes = require('./routes/sitemap_routes');

// Import database
const db = require('./config/database');

const app = express();

// ==================== MIDDLEWARE ====================

// Trust proxy - for IP addresses
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://beansnews.com',
      'https://admin.beansnews.com',
      'https://api.beansnews.com',
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Compression middleware
app.use(compression());

// Request logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Static files
const staticOptions = {
  maxAge: '30d', // 30 days
  immutable: true,
  setHeaders: (res, path) => {
    if (express.static.mime.lookup(path) === 'text/html') {
      res.setHeader('Cache-Control', 'public, max-age=0');
    }
  }
};

app.use('/uploads', express.static('uploads', staticOptions));
app.use('/public', express.static('public', staticOptions));

// ==================== CACHING MIDDLEWARE ====================

// Cache public GET requests for 1 hour to leverage CDN/Edge caching
const publicCache = (req, res, next) => {
  if (req.method === 'GET') {
    res.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
  }
  next();
};

app.use('/api/articles', publicCache);
app.use('/api/categories', publicCache);

// ==================== ROUTES ====================

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// API version
app.get('/api/v1', (req, res) => {
  res.json({
    name: 'Telegraph India Clone API',
    version: '1.0.0',
    status: 'active'
  });
});

// Authentication routes
app.use('/api/auth', authRoutes);

// Article routes
app.use('/api/articles', articleRoutes);

// Category routes
app.use('/api/categories', categoryRoutes);

// User routes (profile, settings)
app.use('/api/users', userRoutes);

// Comment routes
app.use('/api/comments', commentRoutes);

// Newsletter routes
app.use('/api/newsletter', newsLetterRoutes);

// Upload routes (Cloudinary imaging)
const uploadRoutes = require('./routes/upload_routes');
app.use('/api/upload', uploadRoutes);

// Admin routes
app.use('/api/admin', adminRoutes);

// Sitemap route
app.use('/', sitemapRoutes);


// Robots.txt
app.get('/robots.txt', (req, res) => {
  const robots = `User-agent: *
Allow: /
Allow: /api/articles
Disallow: /api/admin
Disallow: /api/auth
Sitemap: ${process.env.SITE_URL || 'https://beansnews.com'}/sitemap.xml`;

  res.type('text/plain').send(robots);
});

// ==================== ERROR HANDLING ====================

// 404 - Not Found
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.path}`,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      details: err.message
    });
  }

  // Database errors
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry - resource already exists'
    });
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File too large - maximum limit is 5MB'
    });
  }

  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`
    });
  }

  // Generic error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Server error',
    error: process.env.NODE_ENV === 'development' ? err : undefined,
    timestamp: new Date().toISOString()
  });
});

// ==================== SERVER STARTUP ====================

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║     Telegraph India Clone - Backend Server             ║
╠════════════════════════════════════════════════════════╣
║ Server Status:  ✅ Running                             ║
║ Environment:    ${NODE_ENV.padEnd(41)}║
║ Port:           ${String(PORT).padEnd(43)}║
║ Database:       ${(process.env.DB_NAME || 'news_db').padEnd(42)}║
║ Time:           ${new Date().toLocaleString().padEnd(40)}║
╠════════════════════════════════════════════════════════╣
║ API Endpoints (Production):                            ║
║   Site:         https://beansnews.com                  ║
║   Admin:        https://admin.beansnews.com            ║
║   API:          https://api.beansnews.com/api          ║
║   Health:       https://api.beansnews.com/health       ║
╚════════════════════════════════════════════════════════╝
  `);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

module.exports = app;

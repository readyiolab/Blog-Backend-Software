# 🔒 Security Best Practices & Next Steps

## Security Best Practices Checklist

### ✅ Authentication & Passwords
- ✅ Passwords hashed with **bcryptjs** (10 rounds)
- ✅ JWT tokens with **expiry** (7 days)
- ✅ Refresh token implementation ready
- ✅ Password change requires **current password verification**
- ✅ Secure password reset flow with **token-based validation**
- ✅ Account lockout on failed attempts ready

### ✅ Network Security
- ✅ **HTTPS** required in production (configure reverse proxy)
- ✅ **CORS** restrictions (whitelist origins in .env)
- ✅ **Helmet** for HTTP security headers
- ✅ **CSRF** tokens ready for implementation
- ✅ **XSS** protection via helmet

### ✅ Database Security
- ✅ **SQL injection prevention** (parameterized queries)
- ✅ **Database credentials** in .env (never hardcoded)
- ✅ **Connection pooling** ready for production
- ✅ **Regular backups** recommended (automated daily)
- ✅ **Prepared statements** via mysql library

### ✅ Input Validation
- ✅ Email validation on registration
- ✅ Password strength validation (min 6 chars)
- ✅ Input sanitization ready
- ✅ File upload limits configured
- ✅ Request body size limits

### ✅ Rate Limiting
- ✅ Rate limiter middleware ready to implement
- ✅ Login attempt limiting recommended
- ✅ API request throttling ready
- ✅ Brute force protection ready

### ✅ Monitoring & Logging
- ✅ **Activity logging** for all admin actions
- ✅ **User action audit trail**
- ✅ **Morgan** HTTP logging
- ✅ **Error logging** with stack traces
- ✅ **Security event** logging

---

## Critical Security Checklist (Before Production)

### Must-Do Items
- [ ] **Enable HTTPS** with valid SSL certificate
- [ ] **Set strong JWT_SECRET** (min 32 chars, random)
- [ ] **Configure CORS_ORIGIN** whitelist (remove localhost)
- [ ] **Setup database backups** (daily minimum)
- [ ] **Enable rate limiting** on auth endpoints
- [ ] **Configure file upload** restrictions
- [ ] **Set MAX_FILE_SIZE** appropriately (default 5MB)
- [ ] **Review ALLOWED_EXTENSIONS** (only needed types)
- [ ] **Setup monitoring** & alerting
- [ ] **Test password reset** flow
- [ ] **Verify token expiry** works
- [ ] **Check helmet headers** are present
- [ ] **Validate all user inputs** (backend)
- [ ] **Test SQL injection** prevention
- [ ] **Review role permissions** carefully
- [ ] **Setup activity log** monitoring
- [ ] **Implement refresh tokens** (for long sessions)
- [ ] **Configure SMTP** for password reset emails
- [ ] **Test backup & restore** procedures
- [ ] **Review error messages** (don't leak info)

---

## Next Steps Implementation Guide

### Phase 1: Foundation (Week 1) ⭐ CRITICAL

#### ✅ 1-2: Database & Authentication Already Done
- Database schema with RBAC
- User registration & login
- JWT authentication

#### ⬜ 3: Implement Rate Limiting
**Install:**
```bash
npm install express-rate-limit
```

**Create** `middleware/rate_limiter.js`:
```javascript
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => req.ip,
  skip: (req, res) => req.user // Skip if already authenticated
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registrations per hour
  message: 'Too many accounts created from this IP, please try again later'
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // 100 requests per 15 min
});

module.exports = {
  loginLimiter,
  registerLimiter,
  apiLimiter
};
```

**Apply in** `auth_routes.js`:
```javascript
const { loginLimiter, registerLimiter } = require('../middleware/rate_limiter');

router.post('/login', loginLimiter, async (req, res) => {
  // login handler
});

router.post('/register', registerLimiter, async (req, res) => {
  // register handler
});
```

**Apply in** `app.js`:
```javascript
const { apiLimiter } = require('./middleware/rate_limiter');
app.use('/api/', apiLimiter); // Apply to all API routes
```

#### ⬜ 4: Add CSRF Token Protection
**Install:**
```bash
npm install csurf cookie-parser
```

**Create** `middleware/csrf_protection.js`:
```javascript
const csrf = require('csurf');
const cookieParser = require('cookie-parser');

const csrfProtection = csrf({ cookie: true });

module.exports = {
  csrfProtection,
  cookieParser
};
```

**Apply in** `app.js`:
```javascript
const { csrfProtection, cookieParser: cp } = require('./middleware/csrf_protection');

app.use(cp());

// Get CSRF token endpoint
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});
```

**Apply to state-changing routes:**
```javascript
router.post('/articles', csrfProtection, authorize('create_article'), handler);
router.put('/articles/:id', csrfProtection, authorize('edit_article'), handler);
router.delete('/articles/:id', csrfProtection, authorize('delete_article'), handler);
```

---

### Phase 2: Content Management (Week 2)

#### ⬜ 5: Comment Management System
**Create** `routes/comment_routes.js`:
```javascript
const express = require('express');
const router = express.Router();
const db = require('../models/database');
const { verifyToken, authorize } = require('../middleware/rbac_middleware');

// Get approved comments for article
router.get('/article/:articleId', async (req, res) => {
  try {
    const comments = await db.getApprovedComments(
      req.params.articleId,
      10,
      (req.query.page - 1) * 10
    );
    res.json({ success: true, data: comments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching comments' });
  }
});

// Create comment
router.post(
  '/',
  verifyToken,
  async (req, res) => {
    try {
      const { articleId, text } = req.body;
      
      if (!articleId || !text || text.length < 3) {
        return res.status(400).json({
          success: false,
          message: 'Comment must be at least 3 characters'
        });
      }

      await db.insert('comments', {
        article_id: articleId,
        user_id: req.user.id,
        comment_text: text,
        status: 'pending'
      });

      res.status(201).json({
        success: true,
        message: 'Comment submitted for approval'
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error creating comment' });
    }
  }
);

// Delete own comment
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const comment = await db.select('comments', '*', 'id = ?', [req.params.id]);
    
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    if (comment.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Can only delete own comments'
      });
    }

    await db.delete('comments', 'id = ?', [req.params.id]);

    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting comment' });
  }
});

// Approve comment (Admin/Editor only)
router.put(
  '/:id/approve',
  verifyToken,
  authorize('manage_comments'),
  async (req, res) => {
    try {
      await db.update('comments', { status: 'approved' }, 'id = ?', [req.params.id]);
      res.json({ success: true, message: 'Comment approved' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error approving comment' });
    }
  }
);

module.exports = router;
```

**Mount in** `app.js`:
```javascript
const commentRoutes = require('./routes/comment_routes');
app.use('/api/comments', commentRoutes);
```

#### ⬜ 6: Category Management
**Create** `routes/category_routes.js`:
```javascript
const express = require('express');
const router = express.Router();
const db = require('../models/database');
const { verifyToken, authorizeRole } = require('../middleware/rbac_middleware');

// Public: Get all categories
router.get('/', async (req, res) => {
  try {
    const categories = await db.getCategories();
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching categories' });
  }
});

// Admin: Create category
router.post(
  '/',
  verifyToken,
  authorizeRole('Admin'),
  async (req, res) => {
    try {
      const { categoryName, description } = req.body;
      
      if (!categoryName) {
        return res.status(400).json({
          success: false,
          message: 'Category name required'
        });
      }

      const slug = db.generateSlug(categoryName);

      await db.insert('categories', {
        category_name: categoryName,
        slug,
        description: description || '',
        status: 'active'
      });

      res.status(201).json({
        success: true,
        message: 'Category created'
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error creating category' });
    }
  }
);

// Admin: Update category
router.put(
  '/:id',
  verifyToken,
  authorizeRole('Admin'),
  async (req, res) => {
    try {
      const { categoryName, description } = req.body;

      const updateData = {};
      if (categoryName) {
        updateData.category_name = categoryName;
        updateData.slug = db.generateSlug(categoryName);
      }
      if (description) updateData.description = description;

      await db.update('categories', updateData, 'id = ?', [req.params.id]);

      res.json({ success: true, message: 'Category updated' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error updating category' });
    }
  }
);

// Admin: Delete category
router.delete(
  '/:id',
  verifyToken,
  authorizeRole('Admin'),
  async (req, res) => {
    try {
      // Check if articles use this category
      const articles = await db.queryAll(
        'SELECT COUNT(*) as count FROM articles WHERE category_id = ?',
        [req.params.id]
      );

      if (articles[0].count > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete category with articles'
        });
      }

      await db.delete('categories', 'id = ?', [req.params.id]);

      res.json({ success: true, message: 'Category deleted' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error deleting category' });
    }
  }
);

module.exports = router;
```

#### ⬜ 7: Article Publishing Workflow (Already in article_routes.js)
- Draft status on creation
- Pending for reporters
- Direct publish for editors
- Archive functionality

---

### Phase 3: User Features (Week 3)

#### ⬜ 8: Newsletter Subscription
**Create** `routes/newsletter_routes.js`:
```javascript
const express = require('express');
const router = express.Router();
const db = require('../models/database');
const crypto = require('crypto');

// Subscribe to newsletter
router.post('/subscribe', async (req, res) => {
  try {
    const { email, firstName } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Valid email required'
      });
    }

    // Check if already subscribed
    const existing = await db.select(
      'newsletter_subscribers',
      '*',
      'email = ?',
      [email]
    );

    if (existing && existing.status === 'active') {
      return res.status(400).json({
        success: false,
        message: 'Already subscribed'
      });
    }

    if (existing && existing.status !== 'active') {
      // Resubscribe
      await db.update(
        'newsletter_subscribers',
        { status: 'active' },
        'email = ?',
        [email]
      );
    } else {
      // Generate verification token
      const token = crypto.randomBytes(32).toString('hex');

      await db.insert('newsletter_subscribers', {
        email,
        first_name: firstName || '',
        status: 'active',
        verification_token: token
      });

      // TODO: Send verification email with token
    }

    res.json({
      success: true,
      message: 'Subscribed to newsletter'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Subscription error' });
  }
});

// Unsubscribe
router.post('/unsubscribe', async (req, res) => {
  try {
    const { email } = req.body;

    await db.update(
      'newsletter_subscribers',
      { status: 'unsubscribed' },
      'email = ?',
      [email]
    );

    res.json({ success: true, message: 'Unsubscribed' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unsubscribe error' });
  }
});

module.exports = router;
```

#### ⬜ 9: Image Upload with Validation
**Install:**
```bash
npm install multer sharp
```

**Create** `middleware/upload.js`:
```javascript
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = process.env.UPLOAD_DIR || './uploads';

// Create upload directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880 // 5MB
  }
});

module.exports = upload;
```

**Use in articles:**
```javascript
const upload = require('../middleware/upload');

router.post(
  '/upload-image',
  verifyToken,
  upload.single('image'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      res.json({
        success: true,
        data: {
          url: `/uploads/${req.file.filename}`,
          size: req.file.size
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Upload error' });
    }
  }
);
```

---

### Phase 4: Admin & Analytics (Week 4)

#### ⬜ 10: Admin Dashboard API
**Create** `routes/admin_routes.js`:
```javascript
const express = require('express');
const router = express.Router();
const db = require('../models/database');
const { verifyToken, authorizeRole } = require('../middleware/rbac_middleware');

// All admin routes require Admin role
router.use(verifyToken, authorizeRole('Admin'));

// Dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const totalArticles = await db.queryAll(
      'SELECT COUNT(*) as count FROM articles'
    );
    const totalUsers = await db.queryAll(
      'SELECT COUNT(*) as count FROM users'
    );
    const totalComments = await db.queryAll(
      'SELECT COUNT(*) as count FROM comments WHERE status = "pending"'
    );
    const totalViews = await db.queryAll(
      'SELECT SUM(views_count) as total FROM articles'
    );

    res.json({
      success: true,
      data: {
        totalArticles: totalArticles[0].count,
        totalUsers: totalUsers[0].count,
        pendingComments: totalComments[0].count,
        totalViews: totalViews[0].total || 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching stats' });
  }
});

// User management
router.get('/users', async (req, res) => {
  try {
    const users = await db.queryAll(
      `SELECT u.id, u.username, u.email, u.status, r.role_name, u.created_at
       FROM users u
       JOIN roles r ON u.role_id = r.id
       ORDER BY u.created_at DESC`
    );

    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching users' });
  }
});

// Change user role
router.put('/users/:userId/role', async (req, res) => {
  try {
    const { roleId } = req.body;

    await db.update('users', { role_id: roleId }, 'id = ?', [req.params.userId]);

    await db.logActivity(
      req.user.id,
      'change_user_role',
      'user',
      req.params.userId,
      `Changed user role to role_id ${roleId}`,
      req.ip
    );

    res.json({ success: true, message: 'User role updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating user' });
  }
});

// Activity logs
router.get('/logs', async (req, res) => {
  try {
    const logs = await db.queryAll(
      `SELECT al.id, al.action, al.entity_type, al.description, 
              al.ip_address, al.created_at, u.username
       FROM activity_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC
       LIMIT 100`
    );

    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching logs' });
  }
});

module.exports = router;
```

#### ⬜ 11: Email Notifications
**Install:**
```bash
npm install nodemailer
```

**Create** `services/email.js`:
```javascript
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.SITE_URL}/reset-password?token=${resetToken}`;
  
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'Password Reset Request',
    html: `
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>This link expires in 1 hour.</p>
    `
  });
};

module.exports = {
  sendPasswordResetEmail
};
```

---

### Phase 5: Performance & Automation (Week 5)

#### ⬜ 12: Scheduled Tasks
**Install:**
```bash
npm install node-cron
```

**Create** `services/scheduler.js`:
```javascript
const cron = require('node-cron');
const db = require('../models/database');

// Archive old articles (every night at midnight)
cron.schedule('0 0 * * *', async () => {
  console.log('Running archive task...');
  try {
    await db.query(
      `UPDATE articles SET status = 'archived' 
       WHERE status = 'published' AND updated_at < DATE_SUB(NOW(), INTERVAL 6 MONTH)`
    );
  } catch (error) {
    console.error('Archive task error:', error);
  }
});

// Cleanup old activity logs (weekly)
cron.schedule('0 0 * * 0', async () => {
  console.log('Running cleanup task...');
  try {
    await db.delete(
      'activity_logs',
      'created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)'
    );
  } catch (error) {
    console.error('Cleanup task error:', error);
  }
});

module.exports = { startScheduler: () => console.log('Scheduler started') };
```

#### ⬜ 13: Analytics Dashboard
**Create** `routes/analytics_routes.js`:
```javascript
const express = require('express');
const router = express.Router();
const db = require('../models/database');
const { verifyToken, authorize } = require('../middleware/rbac_middleware');

// Article analytics
router.get('/article/:articleId', verifyToken, authorize('view_analytics'), async (req, res) => {
  try {
    const analytics = await db.getArticleAnalytics(req.params.articleId, 30);
    res.json({ success: true, data: analytics });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching analytics' });
  }
});

module.exports = router;
```

#### ⬜ 14: SEO Sitemap Generation
**Create** `routes/sitemap_routes.js`:
```javascript
const express = require('express');
const router = express.Router();
const db = require('../models/database');

router.get('/sitemap.xml', async (req, res) => {
  try {
    const articles = await db.queryAll(
      `SELECT a.slug, a.updated_at, a.views_count
       FROM articles a
       WHERE a.status = 'published'
       ORDER BY a.updated_at DESC`
    );

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    articles.forEach(article => {
      const priority = article.views_count > 5000 ? '1.0' : '0.8';
      xml += '  <url>\n';
      xml += `    <loc>${process.env.SITE_URL}/article/${article.slug}</loc>\n`;
      xml += `    <lastmod>${article.updated_at.toISOString().split('T')[0]}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>${priority}</priority>\n`;
      xml += '  </url>\n';
    });

    xml += '</urlset>';

    res.type('application/xml').send(xml);
  } catch (error) {
    res.status(500).send('Error generating sitemap');
  }
});

module.exports = router;
```

---

## Troubleshooting Guide

### Database Connection Error
**Problem:** "Database Connectivity Error"

**Solution:**
```bash
# Check MySQL is running
sudo service mysql status

# Verify database exists
mysql -u root -p -e "SHOW DATABASES;"

# Test connection
mysql -h localhost -u root -p news_website_db -e "SELECT 1;"
```

Check .env:
```env
DB_HOST=localhost      # Correct hostname
DB_USER=root          # Correct user
DB_PASS=password      # Correct password
DB_NAME=news_website_db  # Database exists
```

---

### Permission Denied
**Problem:** "Permission denied: create_article required"

**Solution:**
```sql
-- Check user exists
SELECT * FROM users WHERE id = ?;

-- Check user has correct role
SELECT u.id, u.username, r.role_name 
FROM users u
JOIN roles r ON u.role_id = r.id
WHERE u.id = ?;

-- Check role has permission
SELECT rp.*, p.permission_name
FROM role_permissions rp
JOIN permissions p ON rp.permission_id = p.id
WHERE rp.role_id = ?;

-- Verify token is valid
-- Token must have correct format: Authorization: Bearer TOKEN
```

---

### Slug Conflicts
**Problem:** Slugs not unique or conflicting

**Solution:**
```sql
-- Check for duplicate slugs
SELECT slug, COUNT(*) as count FROM articles 
GROUP BY slug HAVING count > 1;

-- View slug generation logic (auto-increments)
SELECT * FROM articles WHERE slug LIKE 'article-title%' ORDER BY id;
```

System automatically adds counter: `article-title-1`, `article-title-2`, etc.

---

### Search Not Working
**Problem:** Search returns no results

**Solution:**
```sql
-- Verify FULLTEXT index exists
SHOW INDEX FROM articles WHERE Column_name IN ('title', 'excerpt', 'content');

-- Add index if missing
ALTER TABLE articles ADD FULLTEXT INDEX ft_search (title, excerpt, content);

-- Check articles are published
SELECT COUNT(*) FROM articles WHERE status = 'published';

-- Test search manually
SELECT * FROM articles WHERE MATCH(title, excerpt, content) AGAINST('nodejs' IN BOOLEAN MODE);
```

---

### JWT Token Invalid
**Problem:** "Invalid or expired token"

**Solution:**
```javascript
// Check token format
// Must be: Authorization: Bearer eyJhbGci...

// Check token expiry (7 days)
const decoded = jwt.decode(token);
console.log(decoded.exp); // Unix timestamp

// Verify JWT_SECRET matches
// In production, ensure same secret across instances

// Clear token and re-login if expired
localStorage.removeItem('token');
```

---

### Rate Limiting Triggered
**Problem:** "Too many requests"

**Solution:**
- Wait for rate limit window to reset (15 min for login)
- Check IP isn't being spoofed
- Whitelist legitimate IPs if needed

```javascript
// Check rate limit config
// Login: 5 attempts per 15 minutes
// Registration: 3 per hour
```

---

### CORS Error
**Problem:** "Access to XMLHttpRequest blocked by CORS"

**Solution:**
Add frontend URL to `.env`:
```env
CORS_ORIGIN=http://localhost:3000,https://example.com
```

Ensure:
- URL includes protocol (http/https)
- Port matches exactly
- No trailing slash

---

### File Upload Error
**Problem:** "File size exceeds limit"

**Solution:**
```env
MAX_FILE_SIZE=5242880          # 5MB default
ALLOWED_EXTENSIONS=jpg,jpeg,png,gif
```

```bash
# Ensure upload directory exists
mkdir -p uploads
chmod 755 uploads
```

---

### Email Not Sending
**Problem:** Password reset email not received

**Solution:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password    # NOT regular password
SMTP_FROM=noreply@example.com
```

Check:
- SMTP credentials are correct
- Email provider allows SMTP access
- Port 587 (TLS) or 465 (SSL)
- Sender email is verified
- Check spam folder

---

### Database Connection Pool Issues
**Problem:** "Too many connections to MySQL"

**Solution:**
```javascript
// Reduce pool size or use connection pooling
// Enable in production: mysql2/promise library

// Monitor connections
SHOW PROCESSLIST;
SHOW STATUS LIKE 'Threads%';
```

---

### Slow Query Performance
**Problem:** API responses are slow

**Solution:**
```sql
-- Analyze slow queries
SHOW SLOW LOGS;

-- Add missing indexes
CREATE INDEX idx_article_status ON articles(status);
CREATE INDEX idx_article_published ON articles(published_at);
CREATE INDEX idx_article_category ON articles(category_id);

-- Check query execution plan
EXPLAIN SELECT * FROM articles WHERE status = 'published';
```

---

### Activity Logs Growing Too Large
**Problem:** Database getting too big

**Solution:**
```sql
-- Archive old logs
DELETE FROM activity_logs 
WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);

-- Optimize table
OPTIMIZE TABLE activity_logs;

-- Setup automated cleanup (see scheduler)
```

---

## Production Deployment Checklist

Before going live:

### Security
- [ ] HTTPS/SSL certificate installed
- [ ] JWT_SECRET strong (32+ chars)
- [ ] CORS restricted (no localhost)
- [ ] Rate limiting enabled
- [ ] Helmet headers verified
- [ ] CSRF protection enabled
- [ ] Password reset working
- [ ] Error messages safe (no leaks)

### Database
- [ ] Automated backups daily
- [ ] Connection pooling enabled
- [ ] All indexes created
- [ ] Regular maintenance scheduled
- [ ] Slow query log enabled

### Monitoring
- [ ] Error tracking (Sentry, etc)
- [ ] Activity logs enabled
- [ ] Performance monitoring
- [ ] Uptime monitoring
- [ ] Alert system configured

### Operations
- [ ] Reverse proxy (Nginx)
- [ ] Load balancer (if needed)
- [ ] CDN for static assets
- [ ] Database replication
- [ ] Disaster recovery plan

### Testing
- [ ] Load testing done
- [ ] Backup restore tested
- [ ] Security testing complete
- [ ] User acceptance testing
- [ ] Performance benchmarked


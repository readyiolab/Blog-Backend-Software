# Telegraph India Clone - Backend Setup Guide

## Project Structure

```
project-root/
├── config/
│   └── dotenvconfg.js          # Environment variables
├── models/
│   └── database.js             # Database class with RBAC methods
├── middleware/
│   └── rbac_middleware.js       # Authentication & Authorization
├── routes/
│   ├── article_routes.js        # Article management
│   ├── user_routes.js           # User management
│   ├── category_routes.js       # Category management
│   └── admin_routes.js          # Admin functions
├── controllers/
│   └── articleController.js     # Business logic
└── app.js                       # Express app setup
```

## Database Setup

### 1. Create Database
```sql
CREATE DATABASE news_website_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Run Schema
- Copy the content from `database_schema.sql`
- Execute in your MySQL client

### 3. Verify Tables
```sql
SHOW TABLES;
```

You should see 20+ tables for managing articles, users, categories, comments, etc.

## Environment Variables (.env)

```env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASS=your_password
DB_NAME=news_website_db

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# Server
PORT=5000
NODE_ENV=development

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880

# Email (for newsletter)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

## Installation

### 1. Install Dependencies
```bash
npm install express mysql jwt bcryptjs dotenv cors helmet compression multer
```

### 2. Setup Environment
```bash
cp .env.example .env
# Edit .env with your database credentials
```

### 3. Import Database Schema
```bash
mysql -u root -p news_website_db < database_schema.sql
```

## Role-Based Access Control (RBAC)

### Roles Available

| Role | Permissions | Description |
|------|-------------|-------------|
| **Admin** | All | Full system access |
| **Editor** | Create, Edit, Publish Articles | Manage articles & comments |
| **Reporter** | Create Articles (needs approval) | Submit articles for review |
| **Author** | Create, Edit Own Articles | Can publish own articles |
| **User** | View Articles | Regular user, view only |

### Permissions

```
Article Management:
  - create_article
  - edit_article
  - delete_article
  - publish_article
  - view_all_articles

Category Management:
  - manage_categories

User Management:
  - manage_users

Role Management:
  - manage_roles

Analytics:
  - view_analytics

Comment Moderation:
  - manage_comments

Banner Management:
  - manage_banners

Audit:
  - view_activity_logs
```

## Express App Setup (app.js)

```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();

const articleRoutes = require('./routes/article_routes');
const authRoutes = require('./routes/auth_routes');
const categoryRoutes = require('./routes/category_routes');
const userRoutes = require('./routes/user_routes');
const adminRoutes = require('./routes/admin_routes');

const app = express();

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Static files
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    success: false,
    message: 'Server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## Authentication Flow

### Login
```
POST /api/auth/login
Body: { email, password }
Response: { token, user }
```

### Protected Routes
```
Headers: Authorization: Bearer <token>
```

The `verifyToken` middleware extracts the JWT and attaches user data to `req.user`.

## Using RBAC in Routes

### Check Permission
```javascript
router.post('/articles', 
  verifyToken,
  authorize('create_article'),
  createArticleHandler
);
```

### Check Role
```javascript
router.put('/articles/:id/publish',
  verifyToken,
  authorizeRole('Editor', 'Admin'),
  publishArticleHandler
);
```

### Verify Ownership
```javascript
router.put('/articles/:id',
  verifyToken,
  authorize('edit_article'),
  verifyOwnership('article'),
  editArticleHandler
);
```

## SEO Implementation

### Meta Tags Fields
Every article has:
- `meta_title` (max 160 chars)
- `meta_description` (max 160 chars)
- `meta_keywords`
- `canonical_url`

### URL Slugs
- Auto-generated from title
- SEO-friendly (lowercase, hyphens)
- Unique constraint in database

### Full-Text Search
Articles support full-text search on:
- title
- excerpt
- content

### Sitemap Support
Table `sitemap_log` stores:
- Last modified date
- Change frequency
- Priority score (0.0-1.0)

## API Endpoints

### Articles (Public)
```
GET    /api/articles              # List all articles
GET    /api/articles/slug/:slug   # Get single article
GET    /api/articles/category/:slug # Get by category
GET    /api/articles/search       # Search articles
GET    /api/articles/trending     # Trending articles
GET    /api/articles/featured     # Featured articles
```

### Articles (Protected)
```
POST   /api/articles              # Create article (requires create_article)
PUT    /api/articles/:id          # Edit article (requires edit_article)
DELETE /api/articles/:id          # Delete article (requires delete_article)
PUT    /api/articles/:id/publish  # Publish (requires Editor/Admin)
GET    /api/articles/my-articles  # User's articles
```

### Categories
```
GET    /api/categories            # List all categories
GET    /api/categories/:id        # Get category details
POST   /api/categories            # Create (Admin only)
PUT    /api/categories/:id        # Edit (Admin only)
DELETE /api/categories/:id        # Delete (Admin only)
```

### Users (Admin)
```
GET    /api/users                 # List all users
GET    /api/users/:id             # Get user details
POST   /api/users                 # Create user
PUT    /api/users/:id             # Update user
DELETE /api/users/:id             # Delete user
PUT    /api/users/:id/role        # Change user role
```

### Admin
```
GET    /api/admin/analytics       # System analytics
GET    /api/admin/logs            # Activity logs
GET    /api/admin/comments        # Pending comments
```

## Database Queries Examples

### Get Published Articles with Author
```javascript
const articles = await db.getPublishedArticles(10, 0);
```

### Search Articles
```javascript
const results = await db.searchArticles("nodejs", 10, 0);
```

### Get Article with Full Details
```javascript
const article = await db.queryAll(`
  SELECT a.*, c.category_name, u.username
  FROM articles a
  JOIN categories c ON a.category_id = c.id
  JOIN users u ON a.author_id = u.id
  WHERE a.slug = ?
`, [slug]);
```

### Check User Permission
```javascript
const hasPermission = await db.hasPermission(userId, 'create_article');
```

### Get User Permissions
```javascript
const permissions = await db.getUserPermissions(userId);
```

### Log Activity
```javascript
await db.logActivity(
  userId,
  'create_article',
  'article',
  articleId,
  'Created new article',
  ipAddress
);
```

## Frontend Integration

### Fetch Published Articles
```javascript
fetch('/api/articles')
  .then(res => res.json())
  .then(data => console.log(data));
```

### Get Article by Slug
```javascript
fetch('/api/articles/slug/my-article-title')
  .then(res => res.json())
  .then(data => console.log(data));
```

### Create Article (Authenticated)
```javascript
fetch('/api/articles', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    title: 'My Article',
    excerpt: 'Article summary',
    content: 'Full article content',
    categoryId: 1
  })
})
```

## Best Practices

1. **Always use HTTPS in production**
2. **Hash passwords with bcryptjs**
3. **Validate input on backend**
4. **Use prepared statements** (mysql library does this)
5. **Implement rate limiting**
6. **Add CORS restrictions**
7. **Log all admin actions**
8. **Regular database backups**
9. **Use connection pooling in production**
10. **Set proper file upload limits**

## Security Considerations

- JWT tokens should expire (implement refresh tokens)
- Passwords must be hashed with bcryptjs
- Rate limit login attempts
- Sanitize user inputs
- Use helmet for HTTP headers
- CORS should be restricted in production
- Database credentials in environment variables
- SQL injection prevented by parameterized queries
- XSS protection via helmet
- CSRF tokens for state-changing operations

## Next Steps

1. Create authentication routes (register, login)
2. Implement comment management
3. Add newsletter subscription
4. Create admin dashboard
5. Setup image upload with validation
6. Implement caching (Redis)
7. Add email notifications
8. Setup scheduled tasks (news curation, archiving)
9. Create analytics dashboard
10. Implement SEO sitemap generation

## Troubleshooting

### Database Connection Error
- Check MySQL is running
- Verify credentials in .env
- Check database name

### Permission Denied
- Verify JWT token is valid
- Check user role in database
- Check role_permissions table

### Slug Conflicts
- The counter will auto-increment
- Slugs are unique in database

### Search Not Working
- Ensure FULLTEXT index exists
- Check article status is 'published'

# 📰 Telegraph India Clone - Complete Backend

A production-ready Node.js + MySQL news website backend with **RBAC**, **SEO optimization**, and **complete article management system**.

## 📦 What's Included

### Core Files
- **database_schema.sql** - 20+ MySQL tables with proper relationships
- **database_enhanced.js** - Database class with RBAC & article management methods
- **rbac_middleware.js** - Authentication & authorization middleware
- **article_routes.js** - Complete article CRUD API with SEO
- **auth_routes.js** - User registration, login, profile management
- **app.js** - Express app setup with all routes
- **SETUP_GUIDE.md** - Detailed setup instructions
- **API_DOCUMENTATION.md** - Complete API reference

## 🚀 Quick Start (5 minutes)

### 1. Install Dependencies
```bash
npm install express mysql jwt bcryptjs dotenv cors helmet compression morgan
```

### 2. Create .env File
```env
DB_HOST=localhost
DB_USER=root
DB_PASS=your_password
DB_NAME=news_website_db
JWT_SECRET=your_super_secret_key
PORT=5000
```

### 3. Setup Database
```bash
# Create database
mysql -u root -p -e "CREATE DATABASE news_website_db CHARACTER SET utf8mb4;"

# Import schema
mysql -u root -p news_website_db < database_schema.sql
```

### 4. Start Server
```bash
node app.js
```

Visit: `http://localhost:5000/health`

## 🗄️ Database Structure

```
20+ Tables Including:
├── users (with roles: Admin, Editor, Reporter, Author, User)
├── articles (SEO-friendly with slugs, meta tags)
├── categories & sub_categories
├── tags & article_tags (many-to-many)
├── comments (with moderation)
├── activity_logs (audit trail)
├── article_analytics
├── newsletter_subscribers
└── And more...
```

## 🔐 Role-Based Access Control

| Role | Can Create | Can Publish | Can Edit Own | Can Edit All | Can Delete |
|------|------------|-------------|-------------|-------------|-----------|
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ |
| Editor | ✅ | ✅ | ✅ | ✅ | Limited |
| Reporter | ✅ | ❌ | ✅ | ❌ | ❌ |
| Author | ✅ | ✅ | ✅ | ❌ | Draft only |
| User | ❌ | ❌ | ❌ | ❌ | ❌ |

## 📡 API Endpoints (Quick Reference)

### Public Endpoints
```
GET  /api/articles              # List all articles (paginated)
GET  /api/articles/slug/:slug   # Get article by slug (SEO-friendly)
GET  /api/articles/category/:slug # By category
GET  /api/articles/search?q=... # Full-text search
GET  /api/articles/trending     # Trending articles
GET  /api/articles/featured     # Featured articles
```

### Authentication
```
POST /api/auth/register         # Create new user
POST /api/auth/login            # Login with JWT
GET  /api/auth/profile          # Get user profile
PUT  /api/auth/profile          # Update profile
PUT  /api/auth/change-password  # Change password
POST /api/auth/forgot-password  # Password reset
POST /api/auth/logout           # Logout
```

### Article Management (Protected)
```
POST   /api/articles            # Create article (requires: create_article)
PUT    /api/articles/:id        # Edit article (requires: edit_article)
DELETE /api/articles/:id        # Delete article (requires: delete_article)
PUT    /api/articles/:id/publish # Publish (requires: Editor/Admin)
GET    /api/articles/my-articles # User's articles
```

### Categories
```
GET  /api/categories            # List categories
POST /api/categories            # Create (Admin only)
PUT  /api/categories/:id        # Edit (Admin only)
DELETE /api/categories/:id      # Delete (Admin only)
```

### Admin
```
GET /api/admin/analytics        # System analytics
GET /api/admin/logs             # Activity logs
GET /api/admin/comments         # Pending comments
```

## 🔍 SEO Features

✅ **SEO-Friendly URLs** - Auto-generated slugs  
✅ **Meta Tags** - Title, description, keywords  
✅ **Canonical URLs** - Prevent duplicate content  
✅ **Full-Text Search** - Fast indexed search  
✅ **Sitemap Support** - Automatic sitemap generation  
✅ **Reading Time** - Calculated per article  
✅ **Open Graph** - Social media preview ready  
✅ **Article Analytics** - Track views & engagement  

## 🔑 Key Features

- **RBAC System** - 5 roles, 12 permissions
- **JWT Authentication** - Secure token-based auth
- **Activity Logging** - Audit trail for all actions
- **Full-Text Search** - Fast indexed search
- **Article Management** - Draft, pending, published, archived
- **Comment Moderation** - Approval workflow
- **Newsletter** - Subscriber management
- **Analytics** - Views, engagement tracking
- **Ownership Verification** - Users can edit own content
- **Role-Based Publishing** - Different roles have different capabilities

## 📊 Database Tables

| Table | Purpose |
|-------|---------|
| users | User accounts with roles |
| roles | 5 predefined roles |
| permissions | 12 granular permissions |
| articles | Main article content |
| categories | Article categories |
| comments | User comments (moderated) |
| activity_logs | Audit trail |
| article_analytics | Views & engagement |
| newsletter_subscribers | Newsletter signups |
| tags | Article tags |
| gallery | Article images |

## 🛡️ Security Features

✅ Password hashing with bcryptjs  
✅ JWT token authentication  
✅ SQL injection prevention  
✅ CORS configuration  
✅ Helmet security headers  
✅ Input validation  
✅ Permission-based access control  
✅ Activity logging  
✅ Rate limiting ready  
✅ Environment variables for secrets  

## 📝 Example Usage

### Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "password123",
    "confirmPassword": "password123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'

# Response includes JWT token
```

### Create Article (Authenticated)
```bash
curl -X POST http://localhost:5000/api/articles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Breaking News Story",
    "excerpt": "Summary of the story",
    "content": "Full article content...",
    "categoryId": 1,
    "imageUrl": "https://example.com/image.jpg"
  }'
```

### Get Article by Slug (SEO)
```bash
curl http://localhost:5000/api/articles/slug/breaking-news-story

# Returns full article with tags, gallery, author info
```

### Search Articles
```bash
curl "http://localhost:5000/api/articles/search?q=nodejs&page=1&limit=10"
```

## 🗂️ Project Structure

```
project/
├── config/
│   └── dotenvconfg.js
├── models/
│   └── database.js (enhanced version provided)
├── middleware/
│   └── rbac_middleware.js
├── routes/
│   ├── article_routes.js
│   ├── auth_routes.js
│   ├── category_routes.js
│   ├── user_routes.js
│   ├── comment_routes.js
│   ├── newsletter_routes.js
│   └── admin_routes.js
├── .env
├── app.js
└── package.json
```

## 📚 Documentation Files

1. **SETUP_GUIDE.md** - Complete setup instructions
2. **API_DOCUMENTATION.md** - Detailed API reference
3. **database_schema.sql** - All SQL table definitions
4. **This README.md** - Quick reference

## 🎯 Next Steps

1. ✅ Set up database
2. ✅ Configure .env
3. ✅ Start server
4. ✅ Test health endpoint
5. ⬜ Create categories (admin)
6. ⬜ Register users
7. ⬜ Create articles
8. ⬜ Integrate with frontend
9. ⬜ Deploy to production
10. ⬜ Setup SSL/HTTPS

## 🔧 Customization

### Add New Permission
```sql
INSERT INTO permissions (permission_name, description, module) 
VALUES ('new_permission', 'Description', 'module_name');
```

### Assign Permission to Role
```sql
INSERT INTO role_permissions (role_id, permission_id) 
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.role_name = 'Editor' AND p.permission_name = 'new_permission';
```

### Create New Category
```bash
curl -X POST http://localhost:5000/api/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "categoryName": "Technology",
    "slug": "technology",
    "description": "Tech news and updates",
    "icon": "icon-tech"
  }'
```

## ⚡ Performance Tips

- Use pagination (default 10 per page)
- Index search queries properly
- Cache category lists
- Use CDN for images
- Enable compression (helmet)
- Monitor database queries
- Use connection pooling

## 🐛 Troubleshooting

**Q: Connection Error**
A: Check MySQL is running, verify .env credentials

**Q: Permission Denied**
A: Check JWT token, verify user role in database

**Q: Article Not Found**
A: Check article status is 'published'

**Q: Search Not Working**
A: Ensure FULLTEXT index exists, check article content

## 📞 Support

Refer to:
- **SETUP_GUIDE.md** - Setup issues
- **API_DOCUMENTATION.md** - API questions
- Database schema for table structure

## ✨ Key Highlights

🎯 **Complete** - Everything you need to run a news website  
🔒 **Secure** - RBAC, authentication, input validation  
📱 **SEO Ready** - Slugs, meta tags, sitemap  
⚡ **Fast** - Indexed searches, optimized queries  
🛠️ **Maintainable** - Well-structured, documented code  
🚀 **Scalable** - Ready for production deployment  

## 📄 License

Use freely for your projects.

---

**Ready to deploy?** Start with SETUP_GUIDE.md! 🚀

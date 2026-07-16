-- tbl_Roles Table (Admin, Editor, Reporter, Author, User)
CREATE TABLE tbl_roles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  role_name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- tbl_Users Table (with roles)
CREATE TABLE tbl_users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(15),
  profile_image VARCHAR(255),
  bio TEXT,
  role_id INT NOT NULL,
  status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
  last_login DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES tbl_roles(id),
  INDEX (email),
  INDEX (username),
  INDEX (role_id),
  INDEX (status)
);

-- tbl_Permissions Table
CREATE TABLE tbl_permissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  permission_name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  module VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- tbl_Role-Permission Mapping
CREATE TABLE tbl_role_permissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES tbl_roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES tbl_permissions(id) ON DELETE CASCADE,
  UNIQUE KEY unique_role_permission (role_id, permission_id)
);

-- tbl_Categories Table
CREATE TABLE tbl_categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  category_name VARCHAR(100) NOT NULL,
  slug VARCHAR(120) UNIQUE NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(7),
  is_featured BOOLEAN DEFAULT FALSE,
  display_order INT,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX (slug),
  INDEX (status)
);

-- tbl_Sub-Categories Table
CREATE TABLE tbl_sub_categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  category_id INT NOT NULL,
  subcategory_name VARCHAR(100) NOT NULL,
  slug VARCHAR(120) UNIQUE NOT NULL,
  description TEXT,
  display_order INT,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES tbl_categories(id) ON DELETE CASCADE,
  INDEX (category_id),
  INDEX (slug),
  INDEX (status)
);

-- tbl_Articles/Posts Table (SEO Friendly)
CREATE TABLE tbl_articles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(250) UNIQUE NOT NULL,
  excerpt VARCHAR(500),
  content LONGTEXT NOT NULL,
  featured_image VARCHAR(255),
  featured_image_alt VARCHAR(255),
  category_id INT NOT NULL,
  sub_category_id INT,
  author_id INT NOT NULL,
  editor_id INT,
  status ENUM('draft', 'pending', 'published', 'archived') DEFAULT 'draft',
  
  -- SEO Fields
  meta_title VARCHAR(160),
  meta_description VARCHAR(160),
  meta_keywords VARCHAR(255),
  canonical_url VARCHAR(255),
  
  -- Article Info
  views_count INT DEFAULT 0,
  reading_time INT,
  is_featured BOOLEAN DEFAULT FALSE,
  is_trending BOOLEAN DEFAULT FALSE,
  is_breaking BOOLEAN DEFAULT FALSE,
  allow_comments BOOLEAN DEFAULT TRUE,
  
  published_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (category_id) REFERENCES tbl_categories(id),
  FOREIGN KEY (sub_category_id) REFERENCES tbl_sub_categories(id),
  FOREIGN KEY (author_id) REFERENCES tbl_users(id),
  FOREIGN KEY (editor_id) REFERENCES tbl_users(id),
  
  INDEX (slug),
  INDEX (author_id),
  INDEX (category_id),
  INDEX (status),
  INDEX (published_at),
  INDEX (is_featured),
  INDEX (is_trending),
  INDEX (is_breaking),
  FULLTEXT INDEX ft_search (title, excerpt, content)
);

-- tbl_Article Tags Table (for better SEO)
CREATE TABLE tbl_tags (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tag_name VARCHAR(100) NOT NULL,
  slug VARCHAR(120) UNIQUE NOT NULL,
  description TEXT,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (slug),
  INDEX (status)
);

-- tbl_Article-Tag Mapping
CREATE TABLE tbl_article_tags (
  id INT PRIMARY KEY AUTO_INCREMENT,
  article_id INT NOT NULL,
  tag_id INT NOT NULL,
  FOREIGN KEY (article_id) REFERENCES tbl_articles(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tbl_tags(id) ON DELETE CASCADE,
  UNIQUE KEY unique_article_tag (article_id, tag_id)
);

-- tbl_Comments Table
CREATE TABLE tbl_comments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  article_id INT NOT NULL,
  user_id INT NOT NULL,
  comment_text TEXT NOT NULL,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  is_featured BOOLEAN DEFAULT FALSE,
  likes_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (article_id) REFERENCES tbl_articles(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES tbl_users(id),
  INDEX (article_id),
  INDEX (user_id),
  INDEX (status)
);

-- tbl_Gallery/Images Table
CREATE TABLE tbl_gallery (
  id INT PRIMARY KEY AUTO_INCREMENT,
  article_id INT,
  image_url VARCHAR(255) NOT NULL,
  alt_text VARCHAR(255),
  caption TEXT,
  display_order INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (article_id) REFERENCES tbl_articles(id) ON DELETE CASCADE,
  INDEX (article_id)
);

-- tbl_Video Table (for video articles)
CREATE TABLE tbl_videos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  article_id INT,
  video_url VARCHAR(255) NOT NULL,
  video_type ENUM('youtube', 'vimeo', 'custom') DEFAULT 'youtube',
  thumbnail_url VARCHAR(255),
  duration INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (article_id) REFERENCES tbl_articles(id) ON DELETE CASCADE,
  INDEX (article_id)
);

-- tbl_Newsletter Subscription
CREATE TABLE tbl_newsletter_subscribers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(100) UNIQUE NOT NULL,
  first_name VARCHAR(100),
  status ENUM('active', 'inactive', 'unsubscribed') DEFAULT 'active',
  verification_token VARCHAR(255),
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX (email),
  INDEX (status)
);

-- tbl_Related Articles (for recommendations)
CREATE TABLE tbl_related_articles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  article_id INT NOT NULL,
  related_article_id INT NOT NULL,
  relevance_score INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (article_id) REFERENCES tbl_articles(id) ON DELETE CASCADE,
  FOREIGN KEY (related_article_id) REFERENCES tbl_articles(id) ON DELETE CASCADE,
  UNIQUE KEY unique_related (article_id, related_article_id)
);

-- tbl_SEO Sitemap Log
CREATE TABLE tbl_sitemap_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  article_id INT,
  last_modified DATETIME,
  change_frequency VARCHAR(20),
  priority DECIMAL(3,2),
  FOREIGN KEY (article_id) REFERENCES tbl_articles(id) ON DELETE CASCADE,
  INDEX (article_id)
);

-- tbl_Activity Log (for audit trail)
CREATE TABLE tbl_activity_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INT,
  description TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES tbl_users(id),
  INDEX (user_id),
  INDEX (created_at),
  INDEX (action)
);

-- tbl_Advertising/Banner Management
CREATE TABLE tbl_banners (
  id INT PRIMARY KEY AUTO_INCREMENT,
  banner_name VARCHAR(100) NOT NULL,
  banner_image VARCHAR(255),
  banner_url VARCHAR(255),
  position VARCHAR(50),
  status ENUM('active', 'inactive') DEFAULT 'active',
  start_date DATETIME,
  end_date DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX (status),
  INDEX (start_date),
  INDEX (end_date)
);

-- tbl_Analytics/Stats
CREATE TABLE tbl_article_analytics (
  id INT PRIMARY KEY AUTO_INCREMENT,
  article_id INT NOT NULL,
  views INT DEFAULT 0,
  unique_visitors INT DEFAULT 0,
  shares INT DEFAULT 0,
  date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (article_id) REFERENCES tbl_articles(id) ON DELETE CASCADE,
  INDEX (article_id),
  INDEX (date),
  UNIQUE KEY unique_article_date (article_id, date)
);

-- Insert Default Roles
INSERT INTO tbl_roles (role_name, description) VALUES
('Admin', 'Full system access and administration'),
('Editor', 'Can edit and publish articles'),
('Reporter', 'Can create and submit articles for review'),
('Author', 'Can create and publish their own articles'),
('User', 'Regular website user');

-- Insert Default Permissions
INSERT INTO tbl_permissions (permission_name, description, module) VALUES
('create_article', 'Create new article', 'article'),
('edit_article', 'Edit article', 'article'),
('delete_article', 'Delete article', 'article'),
('publish_article', 'Publish article', 'article'),
('view_all_articles', 'View all articles', 'article'),
('manage_categories', 'Manage categories', 'category'),
('manage_users', 'Manage users', 'user'),
('manage_roles', 'Manage roles and permissions', 'role'),
('view_analytics', 'View analytics', 'analytics'),
('manage_comments', 'Moderate comments', 'comment'),
('manage_banners', 'Manage banners', 'banner'),
('view_activity_logs', 'View activity logs', 'audit');

-- Assign permissions to roles (RBAC)
INSERT INTO tbl_role_permissions (role_id, permission_id) VALUES
-- Admin - All permissions
(1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6), (1, 7), (1, 8), (1, 9), (1, 10), (1, 11), (1, 12),
-- Editor - Article and comment management
(2, 1), (2, 2), (2, 4), (2, 5), (2, 10),
-- Reporter - Create and view articles
(3, 1), (3, 5),
-- Author - Create and edit own articles
(4, 1), (4, 2), (4, 4), (4, 5),
-- User - View articles only
(5, 5);

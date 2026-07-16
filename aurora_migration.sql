-- Aurora RDS Migration SQL for Beans News
-- Domain: beansnews.com

-- Create Database
CREATE DATABASE IF NOT EXISTS beansnews_db;
USE beansnews_db;

-- tbl_Roles Table
CREATE TABLE IF NOT EXISTS tbl_roles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  role_name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- tbl_Users Table
CREATE TABLE IF NOT EXISTS tbl_users (
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
  twitter_url VARCHAR(255),
  facebook_url VARCHAR(255),
  linkedin_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES tbl_roles(id),
  INDEX (email),
  INDEX (username),
  INDEX (role_id),
  INDEX (status)
);

-- tbl_Permissions Table
CREATE TABLE IF NOT EXISTS tbl_permissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  permission_name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  module VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- tbl_Role-Permission Mapping
CREATE TABLE IF NOT EXISTS tbl_role_permissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES tbl_roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES tbl_permissions(id) ON DELETE CASCADE,
  UNIQUE KEY unique_role_permission (role_id, permission_id)
);

-- tbl_Categories Table
CREATE TABLE IF NOT EXISTS tbl_categories (
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
CREATE TABLE IF NOT EXISTS tbl_sub_categories (
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

-- tbl_Articles/Posts Table
CREATE TABLE IF NOT EXISTS tbl_articles (
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

-- tbl_Tags Table
CREATE TABLE IF NOT EXISTS tbl_tags (
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
CREATE TABLE IF NOT EXISTS tbl_article_tags (
  id INT PRIMARY KEY AUTO_INCREMENT,
  article_id INT NOT NULL,
  tag_id INT NOT NULL,
  FOREIGN KEY (article_id) REFERENCES tbl_articles(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tbl_tags(id) ON DELETE CASCADE,
  UNIQUE KEY unique_article_tag (article_id, tag_id)
);

-- tbl_Comments Table
CREATE TABLE IF NOT EXISTS tbl_comments (
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

-- tbl_Activity Log
CREATE TABLE IF NOT EXISTS tbl_activity_logs (
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

-- Insert Default Roles
INSERT INTO tbl_roles (role_name, description) VALUES
('Admin', 'Full system access and administration'),
('Editor', 'Can edit and publish articles'),
('Reporter', 'Can create and submit articles for review'),
('Author', 'Can create and publish their own articles'),
('User', 'Regular website user')
ON DUPLICATE KEY UPDATE description = VALUES(description);

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
('view_activity_logs', 'View activity logs', 'audit')
ON DUPLICATE KEY UPDATE description = VALUES(description), module = VALUES(module);

-- Assign permissions to roles
-- Admin (1)
INSERT IGNORE INTO tbl_role_permissions (role_id, permission_id) VALUES (1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6), (1, 7), (1, 8), (1, 9), (1, 10), (1, 11), (1, 12);
-- Editor (2)
INSERT IGNORE INTO tbl_role_permissions (role_id, permission_id) VALUES (2, 1), (2, 2), (2, 4), (2, 5), (2, 10);
-- Reporter (3)
INSERT IGNORE INTO tbl_role_permissions (role_id, permission_id) VALUES (3, 1), (3, 5);
-- Author (4)
INSERT IGNORE INTO tbl_role_permissions (role_id, permission_id) VALUES (4, 1), (4, 2), (4, 4), (4, 5);
-- User (5)
INSERT IGNORE INTO tbl_role_permissions (role_id, permission_id) VALUES (5, 5);

-- Initial Admin Account (Change password after first login)
-- Password 'admin123' hashed (bcrypt $2a$10$7R..): $2a$10$r6hGkXpL6C.W0.F2.aY.X.Z/6rG/S5v7X9w6R0V.y.S6X.2.Y/... (Wait, I'll use a placeholder or the user's provided credentials if any)
-- Actually, user didn't specify admin login, only DB credentials.
-- I'll insert a default admin with a recognizable username.

-- Initial Admin Account
-- Username: admin, Password: Alok@123
INSERT INTO tbl_users (username, email, password, first_name, last_name, role_id, status)
VALUES ('admin', 'admin@beansnews.com', '$2b$10$5.USsLSZPoQscQDjqcliyOaCzDF6TPDhXVww2oGsn6FdBUCIIwR8G', 'Site', 'Admin', 1, 'active')
ON DUPLICATE KEY UPDATE email = VALUES(email);

-- Initial Categories
INSERT INTO tbl_categories (category_name, slug, description, color, status) VALUES
('Technology', 'technology', 'Latest in tech and gadgets', '#007bff', 'active'),
('Business', 'business', 'Market news and finance', '#28a745', 'active'),
('Entertainment', 'entertainment', 'Movies, music and more', '#dc3545', 'active'),
('Politics', 'politics', 'World and local politics', '#ffc107', 'active')
ON DUPLICATE KEY UPDATE description = VALUES(description), color = VALUES(color);

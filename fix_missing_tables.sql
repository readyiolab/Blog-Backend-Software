-- SQL to create missing tables from aurora_migration.sql
-- Run this on your database to fix the 500 Internal Server Error when fetching articles

-- tbl_Gallery/Images Table
CREATE TABLE IF NOT EXISTS tbl_gallery (
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
CREATE TABLE IF NOT EXISTS tbl_videos (
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
CREATE TABLE IF NOT EXISTS tbl_newsletter_subscribers (
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
CREATE TABLE IF NOT EXISTS tbl_related_articles (
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
CREATE TABLE IF NOT EXISTS tbl_sitemap_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  article_id INT,
  last_modified DATETIME,
  change_frequency VARCHAR(20),
  priority DECIMAL(3,2),
  FOREIGN KEY (article_id) REFERENCES tbl_articles(id) ON DELETE CASCADE,
  INDEX (article_id)
);

-- tbl_Advertising/Banner Management
CREATE TABLE IF NOT EXISTS tbl_banners (
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
CREATE TABLE IF NOT EXISTS tbl_article_analytics (
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

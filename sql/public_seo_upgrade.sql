-- Public SEO and trust-signal upgrades for Beans News
-- Run these statements after reviewing them against your current production schema.

ALTER TABLE tbl_users
ADD COLUMN author_title VARCHAR(120) NULL AFTER bio,
ADD COLUMN author_bio_short VARCHAR(320) NULL AFTER author_title,
ADD COLUMN twitter_url VARCHAR(255) NULL AFTER author_bio_short,
ADD COLUMN linkedin_url VARCHAR(255) NULL AFTER twitter_url,
ADD COLUMN website_url VARCHAR(255) NULL AFTER linkedin_url;

ALTER TABLE tbl_articles
ADD COLUMN faq_json JSON NULL AFTER canonical_url,
ADD COLUMN source_name VARCHAR(150) NULL AFTER faq_json,
ADD COLUMN source_url VARCHAR(255) NULL AFTER source_name,
ADD COLUMN fact_checked_by INT NULL AFTER source_url,
ADD COLUMN fact_checked_at DATETIME NULL AFTER fact_checked_by,
ADD COLUMN schema_type VARCHAR(50) NOT NULL DEFAULT 'NewsArticle' AFTER fact_checked_at,
ADD CONSTRAINT fk_articles_fact_checked_by
  FOREIGN KEY (fact_checked_by) REFERENCES tbl_users(id);

CREATE TABLE IF NOT EXISTS tbl_site_pages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  page_key VARCHAR(80) UNIQUE NOT NULL,
  title VARCHAR(160) NOT NULL,
  slug VARCHAR(160) UNIQUE NOT NULL,
  meta_title VARCHAR(160) NOT NULL,
  meta_description VARCHAR(320) NOT NULL,
  content LONGTEXT NOT NULL,
  status ENUM('draft', 'published') DEFAULT 'published',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tbl_editorial_policies (
  id INT PRIMARY KEY AUTO_INCREMENT,
  policy_key VARCHAR(80) UNIQUE NOT NULL,
  title VARCHAR(160) NOT NULL,
  content LONGTEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

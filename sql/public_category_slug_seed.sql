-- Normalize category slugs to the public SEO URL structure used by the Blog app.
-- Run only after confirming the category names in your database.

UPDATE tbl_categories SET slug = 'india-news' WHERE LOWER(category_name) = 'india';
UPDATE tbl_categories SET slug = 'world-news' WHERE LOWER(category_name) = 'world';
UPDATE tbl_categories SET slug = 'business-news' WHERE LOWER(category_name) = 'business';
UPDATE tbl_categories SET slug = 'finance-news' WHERE LOWER(category_name) = 'finance';
UPDATE tbl_categories SET slug = 'sports-news' WHERE LOWER(category_name) = 'sports';
UPDATE tbl_categories SET slug = 'health-wellness' WHERE LOWER(category_name) IN ('health', 'health & wellness', 'health and wellness');
UPDATE tbl_categories SET slug = 'opinion' WHERE LOWER(category_name) = 'opinion';
UPDATE tbl_categories SET slug = 'latest-news' WHERE LOWER(category_name) = 'latest news';

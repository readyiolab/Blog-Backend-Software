-- SQL to sync categories with intended navigation
-- Run this on your database to add missing categories

INSERT INTO tbl_categories (category_name, slug, description, color, status) VALUES
('Tech & AI Startups', 'tech-ai-startups', 'Explore the fastest-growing AI startups and tech innovations.', '#007bff', 'active'),
('Startup Finance & Funding', 'startup-finance', 'Track funding rounds, venture capital trends, and investments.', '#28a745', 'active'),
('Digital Marketing & Growth', 'digital-marketing', 'Growth strategies, SEO, and marketing insights.', '#dc3545', 'active'),
('Founder Stories & Case Studies', 'founder-stories', 'Real-world startup success and failure case studies.', '#ffc107', 'active'),
('Side Hustles & Online Business', 'side-hustles', 'Passive income, freelancing, and profitable online projects.', '#6c757d', 'active')
ON DUPLICATE KEY UPDATE status = 'active';

-- Optional: mark old categories as inactive if they are no longer used
UPDATE tbl_categories SET status = 'inactive' WHERE slug NOT IN ('tech-ai-startups', 'startup-finance', 'digital-marketing', 'founder-stories', 'side-hustles');


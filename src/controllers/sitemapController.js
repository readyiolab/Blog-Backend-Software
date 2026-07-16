const db = require('../models/database');
const { siteUrl } = require('../config/dotenvConfig');

exports.generateSitemap = async (req, res) => {
    try {
        const categories = await db.queryAll("SELECT slug, updated_at FROM tbl_categories WHERE status = 'active'");
        const articles = await db.queryAll(`
            SELECT a.slug, a.updated_at, c.slug as category_slug 
            FROM tbl_articles a 
            JOIN tbl_categories c ON a.category_id = c.id 
            WHERE a.status = 'published' AND c.status = 'active'
        `);

        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

        // Add Homepage
        xml += `  <url>\n    <loc>${siteUrl}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;

        // Add Categories
        categories.forEach(cat => {
            const lastMod = cat.updated_at ? new Date(cat.updated_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
            xml += `  <url>\n    <loc>${siteUrl}/${cat.slug}</loc>\n    <lastmod>${lastMod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
        });

        // Add Articles
        articles.forEach(art => {
            const lastMod = art.updated_at ? new Date(art.updated_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
            const sectionSlug = art.category_slug || 'news'; 
            xml += `  <url>\n    <loc>${siteUrl}/${sectionSlug}/${art.slug}</loc>\n    <lastmod>${lastMod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`;
        });

        xml += '</urlset>';

        res.header('Content-Type', 'application/xml');
        res.send(xml);
    } catch (error) {
        console.error('Sitemap generation error:', error);
        res.status(500).send('Error generating sitemap');
    }
};

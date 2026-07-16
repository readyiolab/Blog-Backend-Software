const db = require('../models/database');

exports.getDashboard = async (req, res) => {
    try {
        const data = await db.getDashboardStatsForUser(req.user);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getStats = async (req, res) => {
    try {
        const articleCount = await db.queryAll('SELECT COUNT(*) as count FROM tbl_articles');
        const userCount = await db.queryAll('SELECT COUNT(*) as count FROM tbl_users');
        const viewCount = await db.queryAll('SELECT COALESCE(SUM(views_count), 0) as count FROM tbl_articles');
        const commentCount = await db.queryAll("SELECT COUNT(*) as count FROM tbl_comments WHERE status = 'pending'");
        res.json({
            success: true,
            data: {
                total_articles: articleCount[0].count || 0,
                total_users: userCount[0].count || 0,
                total_views: viewCount[0].count || 0,
                total_comments: commentCount[0].count || 0
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getLogs = async (req, res) => {
    try {
        const logs = await db.getActivityLogs(100);
        res.json({ success: true, data: logs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getNewsletterSubscribers = async (req, res) => {
    try {
        const subscribers = await db.queryAll('SELECT * FROM tbl_newsletter_subscribers ORDER BY created_at DESC');
        res.json({ success: true, data: subscribers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

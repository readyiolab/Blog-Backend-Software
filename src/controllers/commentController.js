const db = require('../models/database');
const { clearCache } = require('../middleware/cache_middleware');

exports.getComments = async (req, res) => {
    try {
        const { articleId } = req.params;
        const comments = await db.getCommentsByArticle(articleId);
        res.json({ success: true, data: comments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.addComment = async (req, res) => {
    try {
        const { articleId, content } = req.body;
        await db.beginTransaction();
        const result = await db.insert('tbl_comments', {
            article_id: articleId,
            user_id: req.user ? req.user.id : null,
            comment_text: content,
            status: 'approved'
        });
        await db.commit();
        await clearCache('*');
        res.status(201).json({ success: true, data: { id: result.insert_id } });
    } catch (error) {
        try { await db.rollback(); } catch (e) { }
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getAllComments = async (req, res) => {
    try {
        const comments = await db.getCommentsForAdmin();
        res.json({ success: true, data: comments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.approveComment = async (req, res) => {
    try {
        const { id } = req.params;
        await db.update('tbl_comments', { status: 'approved' }, 'id = ?', [id]);
        await clearCache('*');
        res.json({ success: true, message: 'Comment approved' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.rejectComment = async (req, res) => {
    try {
        const { id } = req.params;
        await db.update('tbl_comments', { status: 'rejected' }, 'id = ?', [id]);
        await clearCache('*');
        res.json({ success: true, message: 'Comment rejected' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteComment = async (req, res) => {
    try {
        const { id } = req.params;
        await db.delete('tbl_comments', 'id = ?', [id]);
        await clearCache('*');
        res.json({ success: true, message: 'Comment deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

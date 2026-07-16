const db = require('../models/database');

exports.subscribe = async (req, res) => {
    try {
        const { email, firstName } = req.body;
        await db.subscribeNewsletter(email, firstName);
        res.json({ success: true, message: 'Subscribed successfully' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'You are already subscribed to our newsletter!' });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

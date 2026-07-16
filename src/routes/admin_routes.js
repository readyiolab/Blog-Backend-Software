const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, authorize } = require('../middleware/rbac_middleware');
const { cacheMiddleware } = require('../middleware/cache_middleware');

router.get('/dashboard', verifyToken, cacheMiddleware(60), adminController.getDashboard);
router.get('/analytics', verifyToken, authorize('view_analytics'), cacheMiddleware(300), adminController.getStats);
router.get('/logs', verifyToken, authorize('view_activity_logs'), cacheMiddleware(30), adminController.getLogs);
router.get('/newsletter-subscribers', verifyToken, cacheMiddleware(30), adminController.getNewsletterSubscribers);


module.exports = router;

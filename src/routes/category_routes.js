const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { verifyToken, authorize } = require('../middleware/rbac_middleware');
const { cacheMiddleware } = require('../middleware/cache_middleware');

router.get('/', cacheMiddleware(3600), categoryController.getAllCategories);
router.get('/header', cacheMiddleware(3600), categoryController.getAllCategories);
router.get('/:slug', cacheMiddleware(1800), categoryController.getCategoryBySlug);
router.post('/', verifyToken, authorize('manage_categories'), categoryController.createCategory);
router.put('/:id', verifyToken, authorize('manage_categories'), categoryController.updateCategory);
router.delete('/:id', verifyToken, authorize('manage_categories'), categoryController.deleteCategory);

module.exports = router;

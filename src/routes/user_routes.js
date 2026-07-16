const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, authorize } = require('../middleware/rbac_middleware');

router.get('/profile', verifyToken, userController.getProfile);
router.get('/roles', verifyToken, authorize('manage_users'), userController.getRoles);

// Admin user management
router.get('/', verifyToken, authorize('manage_users'), userController.getUsers);
router.post('/', verifyToken, authorize('manage_users'), userController.createUser);
router.put('/:id', verifyToken, authorize('manage_users'), userController.updateUser);
router.delete('/:id', verifyToken, authorize('manage_users'), userController.deleteUser);

// Role management
router.post('/roles', verifyToken, authorize('manage_roles'), userController.createRole);
router.put('/roles/:id', verifyToken, authorize('manage_roles'), userController.updateRole);
router.delete('/roles/:id', verifyToken, authorize('manage_roles'), userController.deleteRole);

module.exports = router;

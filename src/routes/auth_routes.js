const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/rbac_middleware');
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.'
});

// Register new user
router.post('/register', authLimiter, authController.register);

// Login user
router.post('/login', authLimiter, authController.login);

// Get current user profile
router.get('/profile', verifyToken, authController.getProfile);

// Update user profile
router.put('/profile', verifyToken, authController.updateProfile);

// Change password
router.put('/change-password', verifyToken, authController.changePassword);

// Request password reset
router.post('/forgot-password', authController.forgotPassword);

// Reset password with token
router.post('/reset-password', authController.resetPassword);

// Logout
router.post('/logout', verifyToken, authController.logout);

module.exports = router;

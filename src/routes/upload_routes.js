const express = require('express');
const router = express.Router();
const { upload, uploadImage } = require('../controllers/uploadController');
const { verifyToken, checkRole } = require('../middleware/rbac_middleware');

// ==================== PROTECTED UPLOAD ROUTE ====================

// Only authenticated users with adequate roles can upload items.
// Using verifyToken to authenticate, and checking roles to prevent basic users from uploading spam.
router.post(
    '/image',
    verifyToken,
    checkRole('Admin', 'Editor', 'Author', 'Reporter'), // Adjust based on who you'd like to permit to upload
    upload.single('image'), // Expect 'image' field in FormData
    uploadImage
);

module.exports = router;

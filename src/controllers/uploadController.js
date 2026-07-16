const { upload } = require('../config/cloudinary');

// Controller function for handling the upload request
const uploadImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file provided or file type is not supported',
            });
        }

        // req.file contains the Cloudinary metadata, including path (URL)
        const imageUrl = req.file.path;

        return res.status(200).json({
            success: true,
            message: 'Image uploaded successfully',
            data: { url: imageUrl }, // Nest in data object for consistency
        });
    } catch (error) {
        console.error('Image upload error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error during image upload',
        });
    }
};

module.exports = {
    upload,
    uploadImage,
};

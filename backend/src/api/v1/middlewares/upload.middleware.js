const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
// Assuming the user's base config index defines cloudinary
const cloudinary = require('cloudinary').v2; 
const AppError = require('../../../utils/errors/AppError');

// Ensure cloudinary is initialized properly via the config if missing, 
// but since config/index.js already configures it, we can just require it safely.

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'unitedMess/avatars', // Organized folder in Cloudinary
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
    },
});

// Strict file filtering
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new AppError('Not an image! Please upload only images.', 400), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

module.exports = upload;

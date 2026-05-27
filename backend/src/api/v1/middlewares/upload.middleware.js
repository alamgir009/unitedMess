const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs = require('fs');
const AppError = require('../../../utils/errors/AppError');
const config = require('../../../config');

// Whitelisted mime types and extensions
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new AppError('Invalid file type. Only JPEG, JPG, PNG, and WEBP images are allowed.', 400), false);
    }
};

let avatarStorage;
let qrCodeStorage;

// Determine if Cloudinary is configured
const isCloudinaryConfigured = config.cloudinary && 
                              config.cloudinary.cloud_name && 
                              config.cloudinary.api_key && 
                              config.cloudinary.api_secret;

if (isCloudinaryConfigured) {
    avatarStorage = new CloudinaryStorage({
        cloudinary: cloudinary,
        params: {
            folder: 'unitedMess/avatars',
            allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
            transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
        },
    });

    qrCodeStorage = new CloudinaryStorage({
        cloudinary: cloudinary,
        params: {
            folder: 'unitedMess/qrcodes',
            allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        },
    });
} else {
    // Disk fallback storage
    const uploadDir = path.join(__dirname, '../../../../uploads');
    const avatarDir = path.join(uploadDir, 'avatars');
    const qrDir = path.join(uploadDir, 'qrcodes');

    // Create directories if they don't exist
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });
    if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir, { recursive: true });

    avatarStorage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, avatarDir);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            cb(null, `avatar-${uniqueSuffix}${path.extname(file.originalname)}`);
        }
    });

    qrCodeStorage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, qrDir);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            cb(null, `qrcode-${uniqueSuffix}${path.extname(file.originalname)}`);
        }
    });
}

// Limits: 5MB for avatars, 2MB for QR codes
const upload = multer({
    storage: avatarStorage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});

const uploadQrCode = multer({
    storage: qrCodeStorage,
    fileFilter,
    limits: { fileSize: 2 * 1024 * 1024 }
});

module.exports = {
    upload,
    uploadQrCode
};

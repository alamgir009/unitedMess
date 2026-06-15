const multer = require('multer');
const path = require('path');
const fs = require('fs');
const AppError = require('../../../utils/errors/AppError');

// Whitelisted mime types and extensions
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

const fileFilter = (req, file, cb) => {
    // 1. Recover mimetype if generic, missing, or alternate format
    const ext = path.extname(file.originalname || '').toLowerCase();

    // Catch HEIC/HEIF files early and explain why they are rejected
    if (ext === '.heic' || ext === '.heif') {
        return cb(new AppError('HEIC/HEIF format is not directly supported. Please convert your image to JPG, PNG, or WEBP.', 400), false);
    }

    const EXT_TO_MIME = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.jfif': 'image/jpeg'
    };

    if (!file.mimetype || file.mimetype === 'application/octet-stream' || file.mimetype === 'image/jpg') {
        const recoveredMime = EXT_TO_MIME[ext];
        if (recoveredMime) {
            file.mimetype = recoveredMime;
        } else if (file.mimetype === 'image/jpg') {
            // Default to image/jpeg if mimetype is image/jpg but extension mapping not found
            file.mimetype = 'image/jpeg';
        }
    }

    // Sanitize original filename (safe alphanumeric, underscores, hyphens)
    const base = path.basename(file.originalname || '', ext);
    const safeBase = base
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/[^a-zA-Z0-9_\-]/g, '_') // Replace spaces, dots, commas, parentheses with underscores
        .replace(/__+/g, '_') // Collapse multiple underscores
        .replace(/^_+|_+$/g, ''); // Trim leading/trailing underscores
    file.originalname = `${safeBase || 'image'}${ext}`;

    // 2. Filter allowed mime types
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return cb(new AppError('Invalid file type. Only JPEG, JPG, PNG, and WEBP images are allowed.', 400), false);
    }

    cb(null, true);
};

// Disk staging setup
const uploadDir = path.join(__dirname, '../../../../uploads');
const avatarDir = path.join(uploadDir, 'avatars');
const qrDir = path.join(uploadDir, 'qrcodes');

// Create directories if they don't exist
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });
if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir, { recursive: true });

const safeFilename = (prefix) => (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${prefix}-${uniqueSuffix}${ext}`);
};

const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, avatarDir),
    filename: safeFilename('avatar'),
});

const qrCodeStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, qrDir),
    filename: safeFilename('qrcode'),
});

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

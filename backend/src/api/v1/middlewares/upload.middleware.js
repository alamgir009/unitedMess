const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs = require('fs');
const AppError = require('../../../utils/errors/AppError');
const config = require('../../../config');

// Whitelisted mime types and extensions
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// MIME → safe extension mapping
const MIME_TO_EXT = {
    'image/jpeg': '.jpg',
    'image/png':  '.png',
    'image/webp': '.webp',
};

// Magic bytes header for each supported image type (first N bytes)
const IMAGE_MAGIC = {
    'image/jpeg': (buf) => buf.length >= 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF,
    'image/png':  (buf) => buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47,
    'image/webp': (buf) => buf.length >= 12 && buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46
                      && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50,
};

function validateFileMagic(file, cb) {
    const validator = IMAGE_MAGIC[file.mimetype];
    if (!validator) return cb(null, true);

    const chunks = [];
    const cleanup = () => {
        file.stream.removeListener('data', onData);
        file.stream.removeListener('error', onError);
        file.stream.removeListener('readable', onReadable);
    };

    const onData = (chunk) => {
        chunks.push(chunk);
        const total = Buffer.concat(chunks);
        if (total.length >= 12) {
            cleanup();
            file.stream.unshift(total);
            return cb(null, validator(new Uint8Array(total.buffer, total.byteOffset, total.length)));
        }
    };

    const onError = () => {
        cleanup();
        cb(null, true);
    };

    const onReadable = () => {
        let chunk;
        while ((chunk = file.stream.read()) !== null) {
            chunks.push(chunk);
            const total = Buffer.concat(chunks);
            if (total.length >= 12) {
                cleanup();
                file.stream.unshift(total);
                return cb(null, validator(new Uint8Array(total.buffer, total.byteOffset, total.length)));
            }
        }
    };

    file.stream.on('data', onData);
    file.stream.on('error', onError);
    file.stream.on('readable', onReadable);

    const initial = file.stream.read(12);
    if (initial !== null) {
        cleanup();
        file.stream.unshift(initial);
        return cb(null, validator(new Uint8Array(initial.buffer, initial.byteOffset, initial.length)));
    }
}

const fileFilter = (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return cb(new AppError('Invalid file type. Only JPEG, JPG, PNG, and WEBP images are allowed.', 400), false);
    }

    validateFileMagic(file, (err, isValid) => {
        if (err || !isValid) {
            return cb(new AppError('File content does not match a supported image format.', 400), false);
        }
        cb(null, true);
    });
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

    const safeFilename = (prefix) => (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = MIME_TO_EXT[file.mimetype] || '.jpg';
        cb(null, `${prefix}-${uniqueSuffix}${ext}`);
    };

    avatarStorage = multer.diskStorage({
        destination: (req, file, cb) => cb(null, avatarDir),
        filename: safeFilename('avatar'),
    });

    qrCodeStorage = multer.diskStorage({
        destination: (req, file, cb) => cb(null, qrDir),
        filename: safeFilename('qrcode'),
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

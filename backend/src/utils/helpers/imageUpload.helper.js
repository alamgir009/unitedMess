const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const AppError = require('../errors/AppError');
const logger = require('../logger/index');
const config = require('../../config');

// Magic-byte validators for post-upload integrity check
const MAGIC_VALIDATORS = {
    'image/jpeg': (buf) => buf.length >= 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF,
    'image/jpg':  (buf) => buf.length >= 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF,
    'image/png':  (buf) => buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47,
    'image/webp': (buf) => buf.length >= 12 && buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46
                      && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50,
};

const isCloudinaryConfigured = () => !!(
    config.cloudinary &&
    config.cloudinary.cloud_name &&
    config.cloudinary.api_key &&
    config.cloudinary.api_secret
);

const safeUnlink = (filePath) => {
    try { fs.unlinkSync(filePath); } catch {}
};

/**
 * Verify disk-stored image byte headers actually match the declared mimetype.
 * Skips remote URLs (Cloudinary CDN paths have no local file).
 */
const verifyImageMagicBytes = (file, { logLabel = 'File integrity check failed:' } = {}) => {
    if (!file.path || /^https?:\/\//.test(file.path)) return;

    try {
        const fd = fs.openSync(file.path, 'r');
        const header = Buffer.alloc(12);
        const bytesRead = fs.readSync(fd, header, 0, 12, 0);
        fs.closeSync(fd);

        const validator = MAGIC_VALIDATORS[file.mimetype];
        const valid = validator && bytesRead >= 3 && validator(new Uint8Array(header.buffer, header.byteOffset, bytesRead));
        if (!valid) {
            safeUnlink(file.path);
            throw new AppError('Uploaded file content does not match a supported image format.', 400);
        }
    } catch (error) {
        if (error.isOperational) throw error;
        safeUnlink(file.path);
        logger.error(logLabel, error);
        throw new AppError('Uploaded file content integrity check failed.', 400);
    }
};

/**
 * Store an uploaded image on Cloudinary (when configured) or fall back to
 * public disk storage, and return its URL. Deletes the local temp file.
 */
const storeUploadedImage = async (file, req, { folder, transformation, diskPrefix, cloudLogLabel, cloudErrorLabel }) => {
    if (isCloudinaryConfigured()) {
        try {
            const ext = path.extname(file.originalname).toLowerCase();
            const base = path.basename(file.originalname, ext);
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            const publicId = `${base}-${uniqueSuffix}`;

            const uploadOptions = { folder, public_id: publicId };
            if (transformation) uploadOptions.transformation = transformation;
            const result = await cloudinary.uploader.upload(file.path, uploadOptions);
            const imageUrl = result.secure_url;

            safeUnlink(file.path);
            return imageUrl;
        } catch (error) {
            safeUnlink(file.path);
            logger.error(cloudLogLabel, error);
            throw new AppError(cloudErrorLabel, 500);
        }
    }

    // Disk storage: convert filesystem path to static URL
    const normalized = file.path.replace(/\\/g, '/');
    const uploadsIdx = normalized.indexOf('/uploads/');
    const relativePath = uploadsIdx !== -1
        ? normalized.substring(uploadsIdx)
        : diskPrefix + (file.filename || '');
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return `${baseUrl}${relativePath}`;
};

module.exports = { MAGIC_VALIDATORS, isCloudinaryConfigured, verifyImageMagicBytes, storeUploadedImage };

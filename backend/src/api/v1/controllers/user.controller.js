const asyncHandler = require('../../../utils/helpers/asyncHandler');
const pick = require('../../../utils/helpers/pick');
const { userService } = require('../../../services');
const { sendSuccessResponse } = require('../../../utils/helpers/response.helper');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const AppError = require('../../../utils/errors/AppError');
const fs = require('fs');
const path = require('path');
const config = require('../../../config');

// Magic-byte validators for post-upload integrity check
const MAGIC_VALIDATORS = {
    'image/jpeg': (buf) => buf.length >= 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF,
    'image/jpg':  (buf) => buf.length >= 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF,
    'image/png':  (buf) => buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47,
    'image/webp': (buf) => buf.length >= 12 && buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46
                      && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50,
};

// Validation helper
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * Validate and extract userId from params or current user
 */
const resolveUserId = (req, allowAdmin = false) => {
    const paramId = req.params?.userId;

    // Admin accessing specific user
    if (allowAdmin && paramId) {
        if (!isValidObjectId(paramId)) {
            throw new AppError('Invalid user ID format', 400);
        }
        return paramId;
    }

    // Self-access (me routes)
    if (!req.user?.id) {
        throw new AppError('Authentication required', 401);
    }
    return req.user.id;
};

// ==================== CRUD Operations ====================

const getUsers = asyncHandler(async (req, res) => {
    const rawFilter = pick(req.query, ['userStatus', 'role', 'isActive', 'payment']);
    const options = pick(req.query, ['page', 'limit', 'sort', 'fields']);

    // Construct clean, typed filter object
    const filter = {};
    if (rawFilter.userStatus) filter.userStatus = String(rawFilter.userStatus).toLowerCase().trim();
    if (rawFilter.role) filter.role = rawFilter.role;
    if (rawFilter.payment) filter.payment = rawFilter.payment;
    
    // Explicit boolean casting for aggregation pipelines
    if (rawFilter.isActive !== undefined) {
        filter.isActive = String(rawFilter.isActive).toLowerCase() === 'true';
    }

    // Sanitize numeric params
    if (options.page) options.page = Math.max(1, parseInt(options.page, 10));
    if (options.limit) options.limit = Math.min(100, Math.max(1, parseInt(options.limit, 10)));

    const result = await userService.getAllUsers(filter, options);
    sendSuccessResponse(res, 200, 'Users retrieved successfully', result);
});

const searchUsers = asyncHandler(async (req, res) => {
    const { q: searchTerm, ...rest } = req.query;
    const options = pick(rest, ['page', 'limit']);

    if (!searchTerm?.trim()) {
        return sendSuccessResponse(res, 200, 'Search results', { users: [], pagination: { total: 0 } });
    }

    const result = await userService.searchUsers(searchTerm.trim(), options);
    sendSuccessResponse(res, 200, 'Search results', result);
});

const getUser = asyncHandler(async (req, res) => {
    // Admin viewing specific user
    const userId = resolveUserId(req, true);
    const user = await userService.getUserById(userId);
    sendSuccessResponse(res, 200, 'User details retrieved', user);
});

const getMe = asyncHandler(async (req, res) => {
    // Current user viewing self
    const user = await userService.getUserById(req.user.id);
    sendSuccessResponse(res, 200, 'Profile retrieved', user);
});

const updateUser = asyncHandler(async (req, res) => {
    const userId = resolveUserId(req, true);
    const user = await userService.updateProfile(userId, req.body, true);
    sendSuccessResponse(res, 200, 'User updated successfully', user);
});

const updateMe = asyncHandler(async (req, res) => {
    // Self-update restrictions
    const allowedUpdates = pick(req.body, ['name', 'phone', 'image', 'email']);
    const user = await userService.updateProfile(req.user.id, allowedUpdates, false);
    sendSuccessResponse(res, 200, 'Profile updated successfully', user);
});

const updateAvatar = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new AppError('Please upload an image file.', 400);
    }

    // Post-upload magic-byte integrity check (disk storage only)
    if (req.file.path && !/^https?:\/\//.test(req.file.path)) {
        try {
            const fd = fs.openSync(req.file.path, 'r');
            const header = Buffer.alloc(12);
            const bytesRead = fs.readSync(fd, header, 0, 12, 0);
            fs.closeSync(fd);

            const validator = MAGIC_VALIDATORS[req.file.mimetype];
            const valid = validator && bytesRead >= 3 && validator(new Uint8Array(header.buffer, header.byteOffset, bytesRead));
            if (!valid) {
                try { fs.unlinkSync(req.file.path); } catch {}
                throw new AppError('Uploaded file content does not match a supported image format.', 400);
            }
        } catch (error) {
            if (error.isOperational) throw error;
            try { fs.unlinkSync(req.file.path); } catch {}
            console.error('File integrity check failed:', error);
            throw new AppError('Uploaded file content integrity check failed.', 400);
        }
    }

    const userId = req.user.id;
    const user = await userService.getUserById(userId);

    // Extract existing Cloudinary Public ID and destroy old image
    if (user.image && user.image.includes('cloudinary.com')) {
        try {
            const urlObj = new URL(user.image);
            const pathSegments = urlObj.pathname.split('/');
            const unitedMessIdx = pathSegments.indexOf('unitedMess');
            if (unitedMessIdx !== -1) {
                const publicIdWithExt = pathSegments.slice(unitedMessIdx).join('/');
                const publicId = publicIdWithExt.replace(/\.[^.]+$/, '');
                await cloudinary.uploader.destroy(publicId);
            }
        } catch (error) {
            console.error('Failed to delete old image from Cloudinary:', error);
        }
    }

    // Determine if Cloudinary is configured
    const isCloudinaryConfigured = config.cloudinary && 
                                  config.cloudinary.cloud_name && 
                                  config.cloudinary.api_key && 
                                  config.cloudinary.api_secret;

    let imageUrl;
    if (isCloudinaryConfigured) {
        try {
            const ext = path.extname(req.file.originalname).toLowerCase();
            const base = path.basename(req.file.originalname, ext);
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            const publicId = `${base}-${uniqueSuffix}`;

            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: 'unitedMess/avatars',
                public_id: publicId,
                transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
            });
            imageUrl = result.secure_url;
            
            // Delete temp local file
            try { fs.unlinkSync(req.file.path); } catch {}
        } catch (error) {
            // Delete temp local file
            try { fs.unlinkSync(req.file.path); } catch {}
            console.error('Cloudinary upload failed:', error);
            throw new AppError('Failed to upload image to cloud storage.', 500);
        }
    } else {
        // Disk storage: convert filesystem path to static URL
        const normalized = req.file.path.replace(/\\/g, '/');
        const uploadsIdx = normalized.indexOf('/uploads/');
        const relativePath = uploadsIdx !== -1
            ? normalized.substring(uploadsIdx)
            : '/uploads/avatars/' + (req.file.filename || '');
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        imageUrl = `${baseUrl}${relativePath}`;
    }

    const updatedUser = await userService.updateProfile(userId, { image: imageUrl }, false);
    sendSuccessResponse(res, 200, 'Profile picture updated successfully', updatedUser);
});

// Admin deletes any user
const deleteUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    await userService.deactivateAccount(userId);
    res.status(204).send();
});

// User deactivates their own account
const deactivateMyAccount = asyncHandler(async (req, res) => {
    await userService.deactivateAccount(req.user.id);
    res.status(204).send();
});

// ==================== Admin Actions ====================

const approveUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    // Service will throw if user not found or already approved
    const user = await userService.approveAccount(userId, req.user.id);
    sendSuccessResponse(res, 200, 'User approved successfully', user);
});

const denyUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { reason } = req.body;

    if (!reason?.trim()) {
        throw new AppError('Denial reason is required', 400);
    }

    const user = await userService.denyAccount(userId, req.user.id, reason.trim());
    sendSuccessResponse(res, 200, 'User denied successfully', user);
});

// ==================== Status Updates ====================

const updatePaymentStatus = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { status } = req.body;

    const user = await userService.updatePaymentStatus(userId, status);
    sendSuccessResponse(res, 200, 'Payment status updated', user);
});

const updateGasBillStatus = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { status } = req.body;

    const user = await userService.updateGasBillStatus(userId, status, req.user.id);
    sendSuccessResponse(res, 200, 'Gas bill status updated', user);
});

// ==================== Statistics & Calculations ====================

const getStats = asyncHandler(async (req, res) => {
    const stats = await userService.getUserStats();
    sendSuccessResponse(res, 200, 'User statistics', stats);
});

const getGrandTotalMarketAmount = asyncHandler(async (req, res) => {
    const grandTotal = await userService.getGrandTotalMarketAmount();
    sendSuccessResponse(res, 200, 'Grand total market amount', { grandTotal });
});

const getGrandTotalMeal = asyncHandler(async (req, res) => {
    const overallMeal = await userService.getGrandTotalMeal();
    sendSuccessResponse(res, 200, 'Overall total meals', { overallMeal });
});

const getMealCharge = asyncHandler(async (req, res) => {
    const mealCharge = await userService.getMealCharge();
    sendSuccessResponse(res, 200, 'Current meal charge rate', { mealCharge });
});

const getBillingMonthStats = asyncHandler(async (req, res) => {
    const stats = await userService.getBillingMonthStats();
    sendSuccessResponse(res, 200, 'Active billing month stats', stats);
});

const getPaybleAmountforMeal = asyncHandler(async (req, res) => {
    // Allow admin to check any user, self only for regular users
    const userId = req.params.userId && req.user.role === 'admin'
        ? req.params.userId
        : req.user.id;

    if (!isValidObjectId(userId)) {
        throw new AppError('Invalid user ID', 400);
    }

    const payingAmount = await userService.getPaybleAmountforMeal(userId);
    sendSuccessResponse(res, 200, 'Payable meal charge calculated', payingAmount);
});

const getPaybleAmountforGasBill = asyncHandler(async (req, res) => {
    // Allow admin to check any user, self only for regular users
    const userId = req.params.userId && req.user.role === 'admin'
        ? req.params.userId
        : req.user.id;

    if (!isValidObjectId(userId)) {
        throw new AppError('Invalid user ID', 400);
    }

    const payingAmount = await userService.getPaybleAmountforGasBill(userId);
    sendSuccessResponse(res, 200, 'Payable gas bill calculated', payingAmount);
});

// ==================== Bulk Operations (if needed) ====================

const bulkUpdateStatus = asyncHandler(async (req, res) => {
    const { userIds, status, type } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
        throw new AppError('User IDs array required', 400);
    }

    const validIds = userIds.filter(isValidObjectId);
    if (validIds.length !== userIds.length) {
        throw new AppError('Some user IDs are invalid', 400);
    }

    // Parallel processing with concurrency limit
    const batchSize = 10;
    const results = [];

    for (let i = 0; i < validIds.length; i += batchSize) {
        const batch = validIds.slice(i, i + batchSize);
        const batchPromises = batch.map(id =>
            type === 'payment'
                ? userService.updatePaymentStatus(id, status)
                : userService.updateGasBillStatus(id, status)
        );
        const batchResults = await Promise.allSettled(batchPromises);
        results.push(...batchResults);
    }

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    sendSuccessResponse(res, 200, 'Bulk update completed', {
        processed: validIds.length,
        successful,
        failed
    });
});

module.exports = {
    getUsers,
    searchUsers,
    getUser,
    getMe,
    updateUser,
    updateMe,
    updateAvatar,
    deleteUser,
    approveUser,
    denyUser,
    updatePaymentStatus,
    updateGasBillStatus,
    getStats,
    getGrandTotalMarketAmount,
    getGrandTotalMeal,
    getMealCharge,
    getBillingMonthStats,
    getPaybleAmountforMeal,
    bulkUpdateStatus,
    deactivateMyAccount,
    getPaybleAmountforGasBill
};
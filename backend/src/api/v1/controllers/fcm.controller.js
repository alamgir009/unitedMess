const FcmToken = require('../../../models/FcmToken.model');
const asyncHandler = require('../../../utils/helpers/asyncHandler');
const { sendSuccessResponse } = require('../../../utils/helpers/response.helper');

const registerFcmToken = asyncHandler(async (req, res) => {
    const { token, deviceInfo } = req.body;

    if (!token) {
        return res.status(400).json({ success: false, message: 'FCM token is required' });
    }

    const existing = await FcmToken.findOne({ token });

    if (existing) {
        existing.userId = req.user.id;
        existing.deviceInfo = deviceInfo || existing.deviceInfo;
        existing.isActive = true;
        existing.lastUsed = new Date();
        await existing.save();
        return sendSuccessResponse(res, 200, 'FCM token updated', { token });
    }

    await FcmToken.create({
        userId: req.user.id,
        token,
        deviceInfo: deviceInfo || {},
        lastUsed: new Date(),
    });

    sendSuccessResponse(res, 201, 'FCM token registered', { token });
});

const unregisterFcmToken = asyncHandler(async (req, res) => {
    const { token } = req.body;

    if (token) {
        await FcmToken.findOneAndUpdate(
            { token, userId: req.user.id },
            { isActive: false }
        );
    } else {
        await FcmToken.updateMany(
            { userId: req.user.id },
            { isActive: false }
        );
    }

    sendSuccessResponse(res, 200, 'FCM token(s) deactivated');
});

module.exports = { registerFcmToken, unregisterFcmToken };
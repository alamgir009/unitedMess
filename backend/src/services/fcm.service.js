const admin = require('firebase-admin');
const FcmToken = require('../models/FcmToken.model');
const config = require('../config');
const logger = require('../utils/logger/index');

let initialized = false;

const initializeFirebase = () => {
    if (initialized) return;
    const fb = config.firebase;
    if (!fb?.projectId || !fb?.clientEmail || !fb?.privateKey) {
        logger.warn('Firebase Admin not configured. FCM push disabled.');
        return;
    }
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: fb.projectId,
                clientEmail: fb.clientEmail,
                privateKey: fb.privateKey,
            }),
        });
        initialized = true;
        logger.info('Firebase Admin initialized for FCM');
    } catch (error) {
        logger.error(`Firebase Admin init failed: ${error.message}`);
    }
};

const sendToUser = async (userId, payload) => {
    if (!initialized) initializeFirebase();
    if (!initialized) return { success: false, channel: 'fcm', error: 'Firebase not initialized' };

    try {
        const tokens = await FcmToken.find({ userId, isActive: true }).lean();
        if (tokens.length === 0) return { success: false, channel: 'fcm', error: 'No active tokens' };

        const registrationTokens = tokens.map((t) => t.token);
        const message = {
            data: {
                title: payload.title || '',
                body: payload.message || '',
                icon: payload.icon || '/assets/icons/resize_logo.png',
                badge: payload.badge || '/assets/icons/resize_logo.png',
                url: payload.actionUrl || '/notifications',
                notificationId: payload.notificationId ? payload.notificationId.toString() : '',
                type: payload.type || 'SYSTEM',
                priority: payload.priority || 'NORMAL',
                timestamp: String(Date.now()),
            },
            tokens: registrationTokens,
        };

        const response = await admin.messaging().sendEachForMulticast(message);

        // Handle token errors
        if (response.failureCount > 0) {
            const deactivatedTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    const errCode = resp.error?.code;
                    if (errCode === 'messaging/registration-token-not-registered' ||
                        errCode === 'messaging/invalid-argument' ||
                        errCode === 'messaging/invalid-registration-token') {
                        deactivatedTokens.push(registrationTokens[idx]);
                    }
                }
            });

            if (deactivatedTokens.length > 0) {
                await FcmToken.updateMany(
                    { token: { $in: deactivatedTokens } },
                    { isActive: false }
                );
                logger.info(`Deactivated ${deactivatedTokens.length} invalid FCM tokens for user ${userId}`);
            }
        }

        return {
            success: response.successCount > 0,
            channel: 'fcm',
            successCount: response.successCount,
            failureCount: response.failureCount,
        };
    } catch (error) {
        logger.error(`FCM sendToUser error for ${userId}: ${error.message}`);
        return { success: false, channel: 'fcm', error: error.message };
    }
};

module.exports = { initializeFirebase, sendToUser };
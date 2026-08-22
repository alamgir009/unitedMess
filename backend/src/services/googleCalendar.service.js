const { google } = require('googleapis');
const crypto = require('crypto');
const User = require('../models/User.model');
const MarketSchedule = require('../models/MarketSchedule.model');
const AppError = require('../utils/errors/AppError');
const { normalizeToUTC } = require('../utils/helpers/date.helper');
const logger = require('../utils/logger/index');

const ENCRYPTION_KEY = process.env.GOOGLE_CALENDAR_ENCRYPTION_KEY || process.env.SECRET_KEY || 'default-key-change-in-production';
const ALGORITHM = 'aes-256-cbc';

const encrypt = (text) => {
    if (!text) return null;
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
};

const decrypt = (encryptedText) => {
    if (!encryptedText) return null;
    try {
        const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
        const [ivHex, encrypted] = encryptedText.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch {
        return null;
    }
};

const getOAuth2Client = () => {
    const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI || `${process.env.BACKEND_URL || 'http://localhost:8080'}/api/v1/auth/google/callback`;

    if (!clientId || !clientSecret) {
        throw new AppError('Google Calendar OAuth not configured', 500);
    }

    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
};

/**
 * Generate Google OAuth URL for Calendar access
 */
const getAuthUrl = (userId) => {
    const oauth2Client = getOAuth2Client();
    const scopes = ['https://www.googleapis.com/auth/calendar'];

    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent',
        state: userId.toString(),
    });
};

/**
 * Exchange authorization code for tokens
 */
const handleCallback = async (userId, code) => {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    const encryptedToken = encrypt(tokens.access_token);
    const encryptedRefreshToken = encrypt(tokens.refresh_token);

    await User.findByIdAndUpdate(userId, {
        googleCalendarToken: encryptedToken,
        googleCalendarRefreshToken: encryptedRefreshToken,
        googleCalendarSyncEnabled: true,
    });

    return { success: true };
};

/**
 * Get an authenticated OAuth2 client for a user
 */
const getAuthenticatedClient = async (userId) => {
    const user = await User.findById(userId)
        .select('+googleCalendarToken +googleCalendarRefreshToken googleCalendarSyncEnabled')
        .lean();

    if (!user?.googleCalendarToken || !user?.googleCalendarRefreshToken) {
        throw new AppError('Google Calendar not connected', 400);
    }

    const accessToken = decrypt(user.googleCalendarToken);
    const refreshToken = decrypt(user.googleCalendarRefreshToken);

    if (!accessToken || !refreshToken) {
        throw new AppError('Invalid Google Calendar credentials', 400);
    }

    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
    });

    oauth2Client.on('tokens', async (newTokens) => {
        if (newTokens.access_token) {
            const encToken = encrypt(newTokens.access_token);
            const updateFields = { googleCalendarToken: encToken };
            if (newTokens.refresh_token) {
                updateFields.googleCalendarRefreshToken = encrypt(newTokens.refresh_token);
            }
            await User.findByIdAndUpdate(userId, updateFields);
        }
    });

    return oauth2Client;
};

/**
 * Sync selected market duty dates to Google Calendar
 */
const syncDatesToCalendar = async (userId, schedules) => {
    const oauth2Client = await getAuthenticatedClient(userId);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const user = await User.findById(userId).select('name').lean();
    const userName = user?.name || 'Member';

    const results = [];

    for (const schedule of schedules) {
        const date = normalizeToUTC(schedule.date);
        const startOfDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 9, 0, 0));
        const endOfDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 18, 0, 0));

        const event = {
            summary: `Market Duty - ${userName}`,
            description: `Market duty assigned to ${userName}. Managed by UnitedMess.`,
            start: {
                date: startOfDay.toISOString().split('T')[0],
                timeZone: 'Asia/Kolkata',
            },
            end: {
                date: endOfDay.toISOString().split('T')[0],
                timeZone: 'Asia/Kolkata',
            },
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'popup', minutes: 60 },
                    { method: 'popup', minutes: 1440 },
                ],
            },
            source: {
                title: 'UnitedMess Market Schedule',
                url: process.env.FRONTEND_URL || 'https://unitedmess.uk',
            },
        };

        try {
            const response = await calendar.events.insert({
                calendarId: 'primary',
                resource: event,
            });

            await MarketSchedule.findByIdAndUpdate(schedule._id, {
                googleCalendarEventId: response.data.id,
            });

            results.push({
                scheduleId: schedule._id,
                eventId: response.data.id,
                success: true,
            });
        } catch (err) {
            logger.error(`Failed to create Google Calendar event for ${schedule.date}: ${err.message}`);
            results.push({
                scheduleId: schedule._id,
                success: false,
                error: err.message,
            });
        }
    }

    return results;
};

/**
 * Remove an event from Google Calendar
 */
const removeEventFromCalendar = async (userId, eventId) => {
    const oauth2Client = await getAuthenticatedClient(userId);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    await calendar.events.delete({
        calendarId: 'primary',
        eventId,
    });

    return { success: true };
};

/**
 * Disconnect Google Calendar (revoke tokens)
 */
const disconnectCalendar = async (userId) => {
    await User.findByIdAndUpdate(userId, {
        googleCalendarToken: null,
        googleCalendarRefreshToken: null,
        googleCalendarSyncEnabled: false,
    });

    return { success: true };
};

/**
 * Check if user has Google Calendar connected
 */
const isConnected = async (userId) => {
    const user = await User.findById(userId)
        .select('+googleCalendarToken +googleCalendarRefreshToken googleCalendarSyncEnabled')
        .lean();

    return {
        connected: !!(user?.googleCalendarToken && user?.googleCalendarRefreshToken),
        syncEnabled: user?.googleCalendarSyncEnabled || false,
    };
};

module.exports = {
    getAuthUrl,
    handleCallback,
    syncDatesToCalendar,
    removeEventFromCalendar,
    disconnectCalendar,
    isConnected,
};

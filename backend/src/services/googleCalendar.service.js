const { google } = require('googleapis');
const crypto = require('crypto');
const User = require('../models/User.model');
const MarketSchedule = require('../models/MarketSchedule.model');
const AppError = require('../utils/errors/AppError');
const { normalizeToUTC } = require('../utils/helpers/date.helper');
const logger = require('../utils/logger/index');
const config = require('../config');

const currentSecret = process.env.GOOGLE_CALENDAR_ENCRYPTION_KEY || config.jwt.secret;
const previousSecret = process.env.GOOGLE_CALENDAR_PREVIOUS_ENCRYPTION_KEY;
const currentKey = crypto.scryptSync(currentSecret, 'unitedmess/google-calendar/v2', 32);
const authenticatedKeys = [
    currentKey,
    ...(previousSecret && previousSecret !== currentSecret
        ? [crypto.scryptSync(previousSecret, 'unitedmess/google-calendar/v2', 32)]
        : []),
];
const utf8 = new TextDecoder('utf-8', { fatal: true });
// Legacy keys are read-only during the migration window.
const legacySecrets = [...new Set([
    previousSecret, process.env.GOOGLE_CALENDAR_ENCRYPTION_KEY, process.env.SECRET_KEY,
    'default-key-change-in-production',
].filter(Boolean))];
let legacyKeys;

const encrypt = (text, userId) => {
    if (!text) return null;
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', currentKey, iv);
    cipher.setAAD(Buffer.from(String(userId)));
    const ciphertext = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    return `v2:${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${ciphertext.toString('hex')}`;
};

const decrypt = (encryptedText, userId) => {
    if (!encryptedText) return null;
    const parts = encryptedText.split(':');
    if (parts[0] === 'v2' && parts.length === 4) {
        const [, iv, tag, ciphertext] = parts;
        for (const key of authenticatedKeys) {
            try {
                const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'), { authTagLength: 16 });
                decipher.setAAD(Buffer.from(String(userId)));
                decipher.setAuthTag(Buffer.from(tag, 'hex'));
                const text = utf8.decode(Buffer.concat([decipher.update(Buffer.from(ciphertext, 'hex')), decipher.final()]));
                return { text, migrate: key !== currentKey };
            } catch {
                // Try the previous configured key during key rotation.
            }
        }
    } else if (parts.length === 2) {
        const [iv, ciphertext] = parts;
        legacyKeys ??= legacySecrets.map(secret => crypto.scryptSync(secret, 'salt', 32));
        for (const key of legacyKeys) {
            try {
                const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(iv, 'hex'));
                const text = utf8.decode(Buffer.concat([decipher.update(Buffer.from(ciphertext, 'hex')), decipher.final()]));
                if (/^[!-~]+$/.test(text)) return { text, migrate: true };
            } catch {
                // Legacy deployments used different configured keys.
            }
        }
    }
    return null;
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
const getAuthUrl = (state) => {
    const oauth2Client = getOAuth2Client();
    const scopes = ['https://www.googleapis.com/auth/calendar'];

    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent',
        state,
    });
};

/**
 * Exchange authorization code for tokens
 */
const handleCallback = async (userId, code) => {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    const encryptedToken = encrypt(tokens.access_token, userId);
    const encryptedRefreshToken = encrypt(tokens.refresh_token, userId);
    if (!encryptedToken || !encryptedRefreshToken) {
        throw new AppError('Google Calendar did not return the required credentials', 502);
    }

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

    if (!user?.googleCalendarSyncEnabled || !user.googleCalendarToken || !user.googleCalendarRefreshToken) {
        throw new AppError('Google Calendar not connected', 400);
    }

    const accessToken = decrypt(user.googleCalendarToken, userId);
    const refreshToken = decrypt(user.googleCalendarRefreshToken, userId);

    if (!accessToken || !refreshToken) {
        throw new AppError('Invalid Google Calendar credentials', 400);
    }

    let storedRefreshToken = user.googleCalendarRefreshToken;
    if (accessToken.migrate || refreshToken.migrate) {
        const migratedRefreshToken = encrypt(refreshToken.text, userId);
        const migrated = await User.updateOne({
            _id: userId,
            googleCalendarToken: user.googleCalendarToken,
            googleCalendarRefreshToken: user.googleCalendarRefreshToken,
            googleCalendarSyncEnabled: true,
        }, {
            $set: {
                googleCalendarToken: encrypt(accessToken.text, userId),
                googleCalendarRefreshToken: migratedRefreshToken,
            },
        });
        if (!migrated.matchedCount) throw new AppError('Calendar connection changed. Please retry.', 409);
        storedRefreshToken = migratedRefreshToken;
    }

    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
        access_token: accessToken.text,
        refresh_token: refreshToken.text,
    });

    oauth2Client.on('tokens', (newTokens) => {
        if (!newTokens.access_token) return;
        const update = { googleCalendarToken: encrypt(newTokens.access_token, userId) };
        if (newTokens.refresh_token) update.googleCalendarRefreshToken = encrypt(newTokens.refresh_token, userId);
        void User.updateOne({
            _id: userId,
            googleCalendarSyncEnabled: true,
            googleCalendarRefreshToken: storedRefreshToken,
        }, { $set: update }).then(({ matchedCount }) => {
            if (matchedCount && update.googleCalendarRefreshToken) storedRefreshToken = update.googleCalendarRefreshToken;
        }).catch(() => logger.warn('Could not persist refreshed Google Calendar credentials'));
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

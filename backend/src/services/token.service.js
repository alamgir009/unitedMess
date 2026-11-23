const { randomUUID } = require('node:crypto');
const jwt = require('jsonwebtoken');
const moment = require('moment');
const config = require('../config');
const AppError = require('../utils/errors/AppError');
const RefreshToken = require('../models/RefreshToken.model');
const User = require('../models/User.model');
const { tokenTypes } = require('../config/tokens');

/**
 * Generate token
 * @param {ObjectId} userId
 * @param {Moment} expires
 * @param {string} type
 * @param {string} [secret]
 * @returns {string}
 */
const generateToken = (userId, expires, type, secret = config.jwt.secret) => {
    const payload = {
        sub: userId,
        iat: moment().unix(),
        exp: expires.unix(),
        type,
        ...(type === tokenTypes.REFRESH && { jti: randomUUID() }),
    };
    return jwt.sign(payload, secret);
};

const verifyAccessToken = (token) => {
    const payload = jwt.verify(token, config.jwt.secret, { algorithms: ['HS256'] });
    if (payload.type !== tokenTypes.ACCESS || typeof (payload.sub || payload.id) !== 'string' ||
        !Number.isFinite(payload.iat) || !Number.isFinite(payload.exp)) {
        throw new AppError('Invalid access token', 401);
    }
    return payload;
};

/**
 * Save a token
 * @param {string} token
 * @param {ObjectId} userId
 * @param {Moment} expires
 * @param {string} type
 * @param {boolean} [blacklisted]
 * @returns {Promise<Token>}
 */
const saveToken = async (token, userId, expires, type, blacklisted = false) => {
    const tokenDoc = await RefreshToken.create({
        token,
        user: userId,
        expires: expires.toDate(),
        type,
        blacklisted,
    });
    return tokenDoc;
};

/**
 * Revoke token
 * @param {string} token
 * @returns {Promise}
 */
const revokeToken = async (token) => {
    await RefreshToken.deleteMany({ token, type: tokenTypes.REFRESH });
};

/**
 * Generate auth tokens
 * @param {User} user
 * @returns {Promise<Object>}
 */
const generateAuthTokens = async (user) => {
    const accessTokenExpires = moment().add(config.jwt.accessExpirationMinutes || 30, 'minutes');
    const accessToken = generateToken(user.id, accessTokenExpires, tokenTypes.ACCESS);

    const refreshTokenExpires = moment().add(config.jwt.refreshExpirationDays || 7, 'days');
    const refreshToken = generateToken(user.id, refreshTokenExpires, tokenTypes.REFRESH);
    await saveToken(refreshToken, user.id, refreshTokenExpires, tokenTypes.REFRESH);

    return {
        access: {
            token: accessToken,
            expires: accessTokenExpires.toDate(),
        },
        refresh: {
            token: refreshToken,
            expires: refreshTokenExpires.toDate(),
        },
    };
};

/**
 * Refresh authentication tokens
 * @param {string} refreshToken
 * @returns {Promise<Object>}
 */
const refreshAuthTokens = async (refreshToken) => {
    try {
        const payload = jwt.verify(refreshToken, config.jwt.secret, { algorithms: ['HS256'] });
        if (payload.type !== tokenTypes.REFRESH) throw new Error('Invalid refresh token');
        const user = await User.findById(payload.sub).select('isActive passwordChangedAt');
        if (!user?.isActive || user.changedPasswordAfter(payload.iat)) throw new Error('Invalid session');
        const consumed = await RefreshToken.findOneAndDelete({
            token: refreshToken, type: tokenTypes.REFRESH, user: user.id, blacklisted: false,
        });
        if (!consumed) throw new Error('Refresh token already consumed');
        return await generateAuthTokens(user);
    } catch (error) {
        throw new AppError('Please authenticate', 401);
    }
};

/**
 * Revoke all refresh tokens for a specific user
 * Used when password changes or account is deactivated
 * @param {string} userId
 * @returns {Promise}
 */
const revokeAllUserTokens = async (userId) => {
    await RefreshToken.deleteMany({ user: userId, type: tokenTypes.REFRESH, blacklisted: false });
};

module.exports = {
    generateToken,
    verifyAccessToken,
    saveToken,
    generateAuthTokens,
    revokeToken,
    refreshAuthTokens,
    revokeAllUserTokens,
};

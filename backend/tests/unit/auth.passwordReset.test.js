/**
 * Password reset regression suite.
 *
 * Root cause guarded here: resetPassword() previously called user.save() with
 * full-document validation. For members whose `meals` array exceeded the
 * 200-item schema cap, that unrelated validator rejected the save with
 * "Meals array too large" — so the password was never changed.
 *
 * The reset must:
 *  - save with validateBeforeSave:false (only password fields changed);
 *  - consume the single-use reset token;
 *  - clear login lockout so the new password works immediately;
 *  - revoke every refresh token;
 *  - still succeed when the confirmation email fails.
 */

jest.mock('../../src/models/User.model');
jest.mock('../../src/services/token.service');
jest.mock('../../src/services/email.service');

const crypto = require('crypto');
const User = require('../../src/models/User.model');
const tokenService = require('../../src/services/token.service');
const emailService = require('../../src/services/email.service');
const authService = require('../../src/services/auth.service');

const TOKEN = 'f'.repeat(64);
const NEW_PASSWORD = 'Str0ng!Passw0rd';

/** Minimal Mongoose-like document for the service under test. */
function stubUser(overrides = {}) {
    const user = {
        _id: '507f1f77bcf86cd799439011',
        email: 'member@example.com',
        name: 'Member',
        passwordResetToken: 'hashed-token',
        passwordResetExpires: new Date(Date.now() + 60_000),
        save: jest.fn().mockResolvedValue(undefined),
        ...overrides,
    };

    User.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(user),
    });

    return user;
}

describe('authService.resetPassword', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        tokenService.revokeAllUserTokens.mockResolvedValue(undefined);
        emailService.sendPasswordResetConfirmation.mockResolvedValue(true);
    });

    it('saves without full-document validation so array caps cannot block the reset', async () => {
        const user = stubUser();

        await authService.resetPassword(TOKEN, NEW_PASSWORD);

        // The single-use token must be consumed.
        expect(user.passwordResetToken).toBeUndefined();
        expect(user.passwordResetExpires).toBeUndefined();
        expect(typeof user.passwordChangedAt).toBe('number');
        expect(user.passwordChangedAt).toBeGreaterThan(0);
        expect(user.password).toBe(NEW_PASSWORD);

        // Regression: must skip validation of unrelated paths (meals/markets).
        expect(user.save).toHaveBeenCalledTimes(1);
        expect(user.save).toHaveBeenCalledWith({ validateBeforeSave: false });
    });

    it('clears any login lockout so the reset password is immediately usable', async () => {
        const user = stubUser({ loginAttempts: 5, lockUntil: new Date(Date.now() + 60_000) });

        await authService.resetPassword(TOKEN, NEW_PASSWORD);

        expect(user.loginAttempts).toBe(0);
        expect(user.lockUntil).toBeUndefined();
    });

    it('revokes all refresh tokens after a successful reset', async () => {
        stubUser();

        await authService.resetPassword(TOKEN, NEW_PASSWORD);

        expect(tokenService.revokeAllUserTokens).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    });

    it('does not fail the reset when the confirmation email cannot be sent', async () => {
        stubUser();
        emailService.sendPasswordResetConfirmation.mockRejectedValue(new Error('SMTP down'));

        await expect(authService.resetPassword(TOKEN, NEW_PASSWORD)).resolves.toBeUndefined();
    });

    it('rejects an unknown or expired token without saving', async () => {
        User.findOne.mockReturnValue({
            select: jest.fn().mockResolvedValue(null),
        });

        await expect(authService.resetPassword(TOKEN, NEW_PASSWORD)).rejects.toMatchObject({
            statusCode: 400,
            message: 'Token is invalid or has expired',
        });
        expect(tokenService.revokeAllUserTokens).not.toHaveBeenCalled();
    });

    it('rejects a weak password before touching the database', async () => {
        await expect(authService.resetPassword(TOKEN, 'weak')).rejects.toMatchObject({
            statusCode: 400,
        });
        expect(User.findOne).not.toHaveBeenCalled();
    });
});

/**
 * Login regression suite.
 *
 * Root cause guarded here: login used to call user.save() to persist
 * lastLogin*. That runs full-document validation, so members whose `meals`
 * array exceeded the old 200-item cap got "Meals array too large" AFTER a
 * correct password was verified — and failed logins hit the same error in
 * incrementLoginAttempts, masking the 401 and disabling lockout.
 *
 * Login must use targeted writes only, and the attempt counter must never
 * validate unrelated paths.
 */

jest.mock('../../src/models/User.model');
jest.mock('../../src/models/Payment.model');
jest.mock('../../src/services/token.service');
jest.mock('../../src/services/email.service');

const User = require('../../src/models/User.model');
const Payment = require('../../src/models/Payment.model');
const tokenService = require('../../src/services/token.service');
const emailService = require('../../src/services/email.service');
const authService = require('../../src/services/auth.service');

const TOKENS = {
    access: { token: 'access-token' },
    refresh: { token: 'refresh-token' },
};

function stubLoginUser(overrides = {}) {
    const user = {
        _id: '507f1f77bcf86cd799439011',
        email: 'member@example.com',
        name: 'Member',
        isActive: true,
        userStatus: 'approved',
        loginAttempts: 0,
        lockUntil: undefined,
        comparePassword: jest.fn().mockResolvedValue(true),
        save: jest.fn().mockResolvedValue(undefined),
        ...overrides,
    };

    const query = {
        select: jest.fn(),
        collation: jest.fn().mockResolvedValue(user),
    };
    query.select.mockReturnValue(query);
    User.findOne.mockReturnValue(query);

    return user;
}

/** findById() is used both as a chain (.select) and awaited directly. */
function stubFindById(user) {
    const query = Promise.resolve(user);
    query.select = jest.fn().mockResolvedValue(user);
    User.findById.mockReturnValue(query);
}

describe('authService.login', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        tokenService.generateAuthTokens.mockResolvedValue(TOKENS);
        emailService.sendAccountLockedEmail.mockResolvedValue(true);
        Payment.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });
    });

    it('records last login with a targeted update and never saves/validates the whole document', async () => {
        const user = stubLoginUser();

        const result = await authService.login('member@example.com', 'Str0ng!Passw0rd', '203.0.113.5', 'jest-agent');

        expect(result.tokens).toEqual(TOKENS);
        expect(result.user).toBe(user);
        expect(user.save).not.toHaveBeenCalled();
        expect(User.findByIdAndUpdate).toHaveBeenCalledTimes(1);
        expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
            user._id,
            {
                $set: {
                    lastLogin: expect.any(Date),
                    lastLoginIP: '203.0.113.5',
                    lastLoginUA: 'jest-agent',
                    loginAttempts: 0,
                },
                $unset: { lockUntil: 1 },
            }
        );
        expect(tokenService.generateAuthTokens).toHaveBeenCalledWith(user);
    });

    it('returns 401 for a wrong password and persists the attempt without validation', async () => {
        const user = stubLoginUser({
            loginAttempts: 2,
            comparePassword: jest.fn().mockResolvedValue(false),
        });
        stubFindById(user);

        await expect(
            authService.login('member@example.com', 'Wrong!Passw0rd', '203.0.113.5', 'jest-agent')
        ).rejects.toMatchObject({
            statusCode: 401,
            message: 'Invalid email or password',
        });

        expect(user.loginAttempts).toBe(3);
        expect(user.lockUntil).toBeUndefined();
        expect(user.save).toHaveBeenCalledWith({ validateBeforeSave: false });
        expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
        expect(tokenService.generateAuthTokens).not.toHaveBeenCalled();
    });

    it('locks the account on the fifth failed attempt and sends the lock email', async () => {
        const user = stubLoginUser({
            loginAttempts: 4,
            comparePassword: jest.fn().mockResolvedValue(false),
        });
        stubFindById(user);

        await expect(
            authService.login('member@example.com', 'Wrong!Passw0rd', '203.0.113.5', 'jest-agent')
        ).rejects.toMatchObject({ statusCode: 401 });

        expect(user.loginAttempts).toBe(5);
        expect(user.lockUntil).toBeInstanceOf(Date);
        expect(user.lockUntil.getTime()).toBeGreaterThan(Date.now());
        expect(emailService.sendAccountLockedEmail).toHaveBeenCalledWith(user.email);
        expect(user.save).toHaveBeenCalledWith({ validateBeforeSave: false });
    });

    it('resets the counter when a previous lock has expired', async () => {
        const user = stubLoginUser({
            loginAttempts: 5,
            lockUntil: new Date(Date.now() - 60_000),
            comparePassword: jest.fn().mockResolvedValue(false),
        });
        stubFindById(user);

        await expect(
            authService.login('member@example.com', 'Wrong!Passw0rd', '203.0.113.5', 'jest-agent')
        ).rejects.toMatchObject({ statusCode: 401 });

        expect(user.loginAttempts).toBe(1);
        expect(user.lockUntil).toBeUndefined();
        expect(user.save).toHaveBeenCalledWith({ validateBeforeSave: false });
    });

    it('rejects a locked account before checking the password', async () => {
        const user = stubLoginUser({
            loginAttempts: 5,
            lockUntil: new Date(Date.now() + 60_000),
        });

        await expect(
            authService.login('member@example.com', 'Str0ng!Passw0rd', '203.0.113.5', 'jest-agent')
        ).rejects.toMatchObject({ statusCode: 423 });

        expect(user.comparePassword).not.toHaveBeenCalled();
        expect(user.save).not.toHaveBeenCalled();
        expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
    });
});

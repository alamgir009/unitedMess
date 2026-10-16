const AppError = require('../errors/AppError');

/**
 * Guard a fetched resource: admins may act on any owner's record,
 * everyone else only on their own.
 */
const assertOwnedOrAdmin = (resource, user, { label, action }) => {
    if (user.role !== 'admin' && resource.user._id.toString() !== user.id) {
        throw new AppError(`You do not have permission to ${action} this ${label}`, 403);
    }
};

module.exports = assertOwnedOrAdmin;

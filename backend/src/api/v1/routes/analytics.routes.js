const express = require('express');
const { query, validationResult } = require('express-validator');
const { protect, authorize } = require('../middlewares/auth.middleware');
const asyncHandler = require('../../../utils/helpers/asyncHandler');
const AppError = require('../../../utils/errors/AppError');
const { sendSuccessResponse } = require('../../../utils/helpers/response.helper');
const analytics = require('../../../services/analytics.service');

const router = express.Router();
router.use(protect, authorize('admin'));
router.use((req, res, next) => {
    res.set('Cache-Control', 'private, no-store');
    next();
});
const validate = (allowed) => (req, res, next) => {
    if (Object.keys(req.query).some((key) => !allowed.includes(key)) || !validationResult(req).isEmpty()) {
        return next(new AppError('Invalid analytics query parameters.', 400));
    }
    next();
};

router.get('/members',
    query('q').optional().isString().isLength({ max: 100 }).trim(),
    validate(['q']),
    asyncHandler(async (req, res) => {
        sendSuccessResponse(res, 200, 'Active analytics members', { members: await analytics.searchMembers(req.query.q) });
    })
);

for (const report of ['market', 'meal']) {
    router.get(`/${report}`,
        query('memberId').optional().isString().isMongoId(),
        query('months').optional().isString().equals('3'),
        validate(['memberId', 'months']),
        asyncHandler(async (req, res) => {
            sendSuccessResponse(res, 200, 'Analytics report', await analytics.getReport(report, req.query.memberId));
        })
    );
}

module.exports = router;

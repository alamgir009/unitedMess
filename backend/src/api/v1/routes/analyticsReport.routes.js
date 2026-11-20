const express = require('express');
const { query, body, param, header, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { pipeline } = require('stream');
const asyncHandler = require('../../../utils/helpers/asyncHandler');
const AppError = require('../../../utils/errors/AppError');
const { sendSuccessResponse } = require('../../../utils/helpers/response.helper');
const reports = require('../../../services/analyticsReport.service');
const pdf = require('../../../services/analyticsReportPdf.service');

const router = express.Router();
const fields = ['type', 'memberId', 'months'];
const check = (source, allowed) => (req, res, next) => {
    if (!validationResult(req).isEmpty() || Object.keys(req[source] || {}).some((key) => !allowed.includes(key))) return next(new AppError('Invalid report parameters.', 400));
    next();
};
const filters = (field) => [
    field('type').isString().isIn(['market', 'meal', 'both']),
    field('memberId').optional().isString().isMongoId(),
    field('months').optional().custom((value) => value === 3 || value === '3'),
];
const emailLimit = rateLimit({ windowMs: 3600000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false, keyGenerator: (req) => String(req.user._id), message: { message: 'Too many report email requests. Try again in an hour.' } });

router.get('/report.pdf', ...filters(query), check('query', fields), asyncHandler(async (req, res, next) => {
    const report = await reports.loadReport(req.query.type, req.query.memberId);
    pdf.validateReport(report);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${pdf.filename(report)}"`, 'Access-Control-Expose-Headers': 'Content-Disposition' });
    pipeline(pdf.streamAnalyticsPDF(report), res, (error) => { if (error && !res.headersSent) next(error); });
}));

router.get('/report/recipients', ...filters(query), check('query', fields), asyncHandler(async (req, res) => {
    const { deliveries, admins } = await reports.recipientsFor(req.query, req.user);
    sendSuccessResponse(res, 200, 'Report recipients', {
        recipients: deliveries.map(({ recipientId, name, email, status, combined }) => ({ recipientId, name, email: status === 'skipped' ? null : email, status, combined })),
        admins: admins.map(({ name, email }) => ({ name, email })),
    });
}));

router.post('/report/email', emailLimit, ...filters(body),
    body('recipients').optional().isArray({ max: 10 }), body('recipients.*').isString().isEmail().isLength({ max: 254 }),
    header('Idempotency-Key').isString().isLength({ min: 16, max: 128 }).matches(/^[a-zA-Z0-9_-]+$/),
    check('body', [...fields, 'recipients']), asyncHandler(async (req, res) => {
        sendSuccessResponse(res, 202, 'Report email queued', await reports.startJob(req.body, req.user, req.get('Idempotency-Key')));
    })
);
router.get('/report/jobs/:jobId', param('jobId').isMongoId(), check('query', []), asyncHandler(async (req, res) => {
    sendSuccessResponse(res, 200, 'Report delivery status', reports.publicJob(await reports.getJob(req.params.jobId, req.user)));
}));
router.post('/report/jobs/:jobId/retry', emailLimit, param('jobId').isMongoId(), check('body', []), asyncHandler(async (req, res) => {
    sendSuccessResponse(res, 202, 'Failed reports queued for retry', await reports.retryJob(req.params.jobId, req.user));
}));
module.exports = router;

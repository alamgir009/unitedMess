const express = require('express');
const authController = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth.middleware');
// const validate = require('../middlewares/validate');
// const authValidation = require('../validators/auth.validator');

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/refresh-tokens', authController.refreshTokens);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/change-password', protect, authController.changePassword);

module.exports = router;

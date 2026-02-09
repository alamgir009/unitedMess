const authService = require('./auth.service');
const tokenService = require('./token.service');
const emailService = require('./email.service');
const userService = require('./user.service');
const mealService = require('./meal.service');
const marketService = require('./market.service');
const paymentService = require('./payment.service');
const razorpayService = require('./razorpay.service');

module.exports = {
    authService,
    tokenService,
    emailService,
    userService,
    mealService,
    marketService,
    paymentService,
    razorpayService,
};

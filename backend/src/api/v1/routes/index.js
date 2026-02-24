const express = require('express');
const router = express.Router();

// Import routes
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const mealRoutes = require('./meal.routes');
const marketRoutes = require('./market.routes');
const paymentRoutes = require('./payment.routes');
const settingsRoutes  = require('./setting.route');
// ...

// Use routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/meals', mealRoutes);
router.use('/markets', marketRoutes);
router.use('/payments', paymentRoutes);
router.use('/setting', settingsRoutes );

router.get('/', (req, res) => {
    res.json({ message: 'API v1 running' });
});

module.exports = router;

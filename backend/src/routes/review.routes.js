const express = require('express');
const controller = require('../controllers/review.controller');
const auth = require('../middlewares/auth.middleware');
const router = express.Router();

router.post('/', auth.authUserMiddleware, controller.createReview);
router.get('/:foodId', auth.authAnyMiddleware, controller.getReviews);

module.exports = router;

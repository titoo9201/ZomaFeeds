const express = require('express');
const controller = require('../controllers/order.controller');
const auth = require('../middlewares/auth.middleware');
const router = express.Router();

router.post('/', auth.authUserMiddleware, controller.createOrder);
router.get('/my', auth.authUserMiddleware, controller.getMyOrders);
router.get('/partner/incoming', auth.authFoodPartnerMiddleware, controller.getPartnerOrders);
router.get('/:id', auth.authUserMiddleware, controller.getOrder);
router.patch('/:id/pay', auth.authUserMiddleware, controller.payOrder);
router.patch('/:id/respond', auth.authFoodPartnerMiddleware, controller.respondToOrder);
router.patch('/:id/advance', auth.authFoodPartnerMiddleware, controller.advanceOrderStatus);

module.exports = router;

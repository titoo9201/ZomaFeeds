const express = require('express');
const controller = require('../controllers/order.controller');
const auth = require('../middlewares/auth.middleware');
const router = express.Router();

router.post('/', auth.authUserMiddleware, controller.createOrder);
router.post('/quote', auth.authUserMiddleware, controller.quoteOrder);
router.get('/my', auth.authUserMiddleware, controller.getMyOrders);
router.get('/partner/incoming', auth.authFoodPartnerMiddleware, controller.getPartnerOrders);
router.get('/rider/available', auth.authRiderMiddleware, controller.getAvailableOrders);
router.get('/rider/active', auth.authRiderMiddleware, controller.getActiveRiderOrder);
router.get('/:id', auth.authUserMiddleware, controller.getOrder);
router.get('/:id/route', auth.authAnyMiddleware, controller.getOrderRoute);
router.patch('/:id/pay', auth.authUserMiddleware, controller.payOrder);
router.patch('/:id/rate', auth.authUserMiddleware, controller.rateOrder);
router.patch('/:id/respond', auth.authFoodPartnerMiddleware, controller.respondToOrder);
router.patch('/:id/advance', auth.authFoodPartnerMiddleware, controller.advanceOrderStatus);
router.patch('/:id/accept-delivery', auth.authRiderMiddleware, controller.acceptDelivery);
router.patch('/:id/pickup', auth.authRiderMiddleware, controller.pickupOrder);
router.patch('/:id/start-delivery', auth.authRiderMiddleware, controller.startDelivery);
router.patch('/:id/deliver', auth.authRiderMiddleware, controller.deliverOrder);

module.exports = router;

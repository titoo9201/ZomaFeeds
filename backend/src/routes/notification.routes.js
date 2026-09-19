const express = require('express');
const controller = require('../controllers/notification.controller');
const auth = require('../middlewares/auth.middleware');
const router = express.Router();

router.get('/my', auth.authUserMiddleware, controller.getMyNotifications);
router.patch('/:id/read', auth.authUserMiddleware, controller.markRead);

module.exports = router;

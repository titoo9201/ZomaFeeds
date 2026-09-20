const express = require('express');
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

router.patch('/location', authMiddleware.authUserMiddleware, userController.updateUserLocation);
router.get('/addresses', authMiddleware.authUserMiddleware, userController.getSavedAddresses);
router.post('/addresses', authMiddleware.authUserMiddleware, userController.addSavedAddress);
router.delete('/addresses/:id', authMiddleware.authUserMiddleware, userController.deleteSavedAddress);

module.exports = router;

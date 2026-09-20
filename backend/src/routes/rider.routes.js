const express = require('express');
const multer = require('multer');
const riderController = require('../controllers/rider.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, callback) => {
        if (file.mimetype.startsWith('image/')) return callback(null, true)
        callback(new Error('Profile picture must be an image'))
    }
})

const router = express.Router();

router.post('/register', upload.single('profilePicture'), riderController.registerRider);
router.post('/login', riderController.loginRider);
router.get('/logout', riderController.logoutRider);
router.get('/me', authMiddleware.authRiderMiddleware, riderController.getMyProfile);
router.patch('/me', authMiddleware.authRiderMiddleware, upload.single('profilePicture'), riderController.updateProfile);
router.patch('/status', authMiddleware.authRiderMiddleware, riderController.updateStatus);
router.patch('/location', authMiddleware.authRiderMiddleware, riderController.updateLocation);

module.exports = router;

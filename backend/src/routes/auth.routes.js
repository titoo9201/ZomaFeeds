const express = require('express');
const authController = require("../controllers/auth.controller")
const authMiddleware = require('../middlewares/auth.middleware')
const multer = require('multer')

const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 5 * 1024 * 1024 },
	fileFilter: (req, file, callback) => {
		if (file.mimetype.startsWith('image/')) return callback(null, true)
		callback(new Error('Profile picture must be an image'))
	}
})

const router = express.Router();

router.get('/me', authController.getCurrentSession)
router.post('/otp/request', authController.requestOtp)
router.get('/user/profile', authMiddleware.authUserMiddleware, authController.getUserProfile)
router.patch('/user/profile', authMiddleware.authUserMiddleware, upload.single('profilePicture'), authController.updateUserProfile)

// user auth APIs
router.post('/user/register', upload.single('profilePicture'), authController.registerUser)
router.post('/user/login', authController.loginUser)
router.get('/user/logout', authController.logoutUser)



// food partner auth APIs
router.post('/food-partner/register', upload.single('profilePicture'), authController.registerFoodPartner)
router.post('/food-partner/login', authController.loginFoodPartner)
router.get('/food-partner/logout', authController.logoutFoodPartner)



module.exports = router;
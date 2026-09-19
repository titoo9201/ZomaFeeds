const express = require('express');
const multer = require('multer');
const foodPartnerController = require("../controllers/food-partner.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, callback) => {
        if (file.mimetype.startsWith('image/')) return callback(null, true)
        callback(new Error('Profile picture must be an image'))
    }
})

const router = express.Router();

router.get('/', authMiddleware.authUserMiddleware, foodPartnerController.listFoodPartners)
router.get('/me', authMiddleware.authFoodPartnerMiddleware, foodPartnerController.getMyProfile)
router.patch('/me', authMiddleware.authFoodPartnerMiddleware, upload.single('profilePicture'), foodPartnerController.updateProfile)
router.patch('/me/hours', authMiddleware.authFoodPartnerMiddleware, foodPartnerController.updateHours)
router.post('/:id/notify-me', authMiddleware.authUserMiddleware, foodPartnerController.notifyMe)


/* /api/food-partner/:id */
router.get("/:id",
    authMiddleware.authUserMiddleware,
    foodPartnerController.getFoodPartnerById)

module.exports = router;
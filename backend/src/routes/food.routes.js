const express = require('express');
const foodController = require("../controllers/food.controller")
const authMiddleware = require("../middlewares/auth.middleware")
const router = express.Router();
const multer = require('multer');


const upload = multer({
    storage: multer.memoryStorage(),
})


router.post('/',
    authMiddleware.authFoodPartnerMiddleware,
    upload.single("mama"),
    foodController.createFood)


router.get("/",
    authMiddleware.authUserMiddleware,
    foodController.getFoodItems)


router.post('/like',
    authMiddleware.authUserMiddleware,
    foodController.likeFood)


router.post('/save',
    authMiddleware.authUserMiddleware,
    foodController.saveFood
)


router.get('/save',
    authMiddleware.authUserMiddleware,
    foodController.getSaveFood
)

router.patch('/:id', authMiddleware.authFoodPartnerMiddleware, foodController.updateFood)

router.delete('/:id', authMiddleware.authFoodPartnerMiddleware, foodController.deleteFood)



module.exports = router
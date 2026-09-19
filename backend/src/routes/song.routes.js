const express = require('express');
const controller = require('../controllers/song.controller');
const auth = require('../middlewares/auth.middleware');
const router = express.Router();

router.get('/search', auth.authFoodPartnerMiddleware, controller.searchSongs);

module.exports = router;

const express = require('express');
const controller = require('../controllers/geo.controller');
const router = express.Router();

// Public: needed on pre-signup forms (e.g. food-partner registration) before any session exists.
router.get('/reverse', controller.reverseGeocode);
router.post('/parse-maps-link', controller.parseMapsLink);

module.exports = router;

const express = require('express');
const controller = require('../controllers/comment.controller');
const auth = require('../middlewares/auth.middleware');
const router = express.Router();

router.post('/', auth.authUserMiddleware, controller.createComment);
router.get('/:foodId', auth.authAnyMiddleware, controller.getComments);
router.delete('/:id', auth.authUserMiddleware, controller.deleteComment);

module.exports = router;

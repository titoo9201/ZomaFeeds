const express = require('express');
const controller = require('../controllers/comment.controller');
const auth = require('../middlewares/auth.middleware');
const router = express.Router();

router.use(auth.authUserMiddleware);
router.post('/', controller.createComment);
router.get('/:foodId', controller.getComments);
router.delete('/:id', controller.deleteComment);

module.exports = router;

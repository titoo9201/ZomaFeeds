const commentModel = require('../models/comment.model');
const foodModel = require('../models/food.model');

async function createComment(req, res) {
    const { food, text } = req.body;
    if (!food || !text?.trim()) return res.status(400).json({ message: 'Food and comment text are required' });
    if (!await foodModel.exists({ _id: food })) return res.status(404).json({ message: 'Food not found' });
    const comment = await commentModel.create({ food, text: text.trim(), user: req.user._id });
    await comment.populate('user', 'fullName profilePicture');
    res.status(201).json({ comment });
}

async function getComments(req, res) {
    const comments = await commentModel.find({ food: req.params.foodId }).populate('user', 'fullName profilePicture').sort({ createdAt: -1 });
    res.json({ comments });
}

async function deleteComment(req, res) {
    const result = await commentModel.deleteOne({ _id: req.params.id, user: req.user._id });
    if (!result.deletedCount) return res.status(404).json({ message: 'Comment not found' });
    res.json({ message: 'Comment deleted' });
}

module.exports = { createComment, getComments, deleteComment };

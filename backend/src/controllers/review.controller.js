const reviewModel = require('../models/review.model');
const foodModel = require('../models/food.model');
const orderModel = require('../models/order.model');

async function createReview(req, res) {
    const { food, rating, text } = req.body;
    if (!food || !Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5) return res.status(400).json({ message: 'Food and a 1 to 5 star rating are required' });
    if (!await foodModel.exists({ _id: food })) return res.status(404).json({ message: 'Food not found' });
    const hasDeliveredOrder = await orderModel.exists({ user: req.user._id, food, status: 'delivered' });
    if (!hasDeliveredOrder) return res.status(403).json({ message: 'You can review this order once it has been delivered' });
    const review = await reviewModel.findOneAndUpdate({ food, user: req.user._id }, { rating: Number(rating), text: text?.trim() || '' }, { upsert: true, new: true, setDefaultsOnInsert: true }).populate('user', 'fullName profilePicture');
    res.status(201).json({ review });
}

async function getReviews(req, res) {
    const reviews = await reviewModel.find({ food: req.params.foodId }).populate('user', 'fullName profilePicture').sort({ createdAt: -1 });
    const average = reviews.length ? reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length : 0;
    res.json({ reviews, average: Number(average.toFixed(1)) });
}

module.exports = { createReview, getReviews };

const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    food: { type: mongoose.Schema.Types.ObjectId, ref: 'food', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    text: { type: String, trim: true, maxlength: 500 }
}, { timestamps: true });

reviewSchema.index({ food: 1, user: 1 }, { unique: true });
module.exports = mongoose.model('review', reviewSchema);

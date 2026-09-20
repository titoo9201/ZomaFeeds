const foodModel = require('../models/food.model');
const storageService = require('../services/storage.service');
const likeModel = require("../models/likes.model")
const saveModel = require("../models/save.model")
const commentModel = require('../models/comment.model')
const reviewModel = require('../models/review.model')
const { v4: uuid } = require("uuid")

async function getPartnerRatingMap() {
    const stats = await foodModel.aggregate([
        { $lookup: { from: reviewModel.collection.name, localField: '_id', foreignField: 'food', as: 'reviews' } },
        { $unwind: '$reviews' },
        { $group: { _id: '$foodPartner', total: { $sum: '$reviews.rating' }, count: { $sum: 1 } } }
    ]);
    return new Map(stats.map(item => [String(item._id), { averageRating: Number((item.total / item.count).toFixed(1)), reviewCount: item.count }]));
}

function parseSong(rawSong) {
    if (!rawSong) return undefined;
    const song = typeof rawSong === 'string' ? JSON.parse(rawSong) : rawSong;
    if (!song?.title || !song?.url) return undefined;
    const clipDuration = Math.min(30, Math.max(5, Number(song.clipDuration) || 30));
    const startTime = Math.max(0, Number(song.startTime) || 0);
    return { id: song.id, title: song.title, artist: song.artist, image: song.image, url: song.url, startTime, clipDuration };
}

async function createFood(req, res) {
    if (!req.file) return res.status(400).json({ message: "A photo or video is required" });
    const isVideo = req.file.mimetype.startsWith('video/');
    const isImage = req.file.mimetype.startsWith('image/');
    if (!isVideo && !isImage) return res.status(400).json({ message: "File must be a photo or a video" });

    const fileUploadResult = await storageService.uploadFile(req.file.buffer, uuid())

    let song;
    try { song = parseSong(req.body.song) } catch { return res.status(400).json({ message: "Invalid song data" }) }

    const foodItem = await foodModel.create({
        name: req.body.name,
        description: req.body.description,
        category: req.body.category,
        price: req.body.price ? Number(req.body.price) : undefined,
        video: fileUploadResult.url,
        mediaType: isImage ? 'image' : 'video',
        foodPartner: req.foodPartner._id,
        song
    })

    res.status(201).json({
        message: "food created successfully",
        food: foodItem
    })

}

async function updateFood(req, res) {
    try {
        const food = await foodModel.findOne({ _id: req.params.id, foodPartner: req.foodPartner._id });
        if (!food) return res.status(404).json({ message: "Food not found or not owned by you" });

        const { name, description, price, isAvailable, category, removeSong } = req.body;
        if (name !== undefined) food.name = name;
        if (description !== undefined) food.description = description;
        if (category !== undefined) food.category = category;
        if (price !== undefined) {
            const numericPrice = Number(price);
            if (!Number.isFinite(numericPrice) || numericPrice < 0) return res.status(400).json({ message: "Price must be a non-negative number" });
            food.price = numericPrice;
        }
        if (isAvailable !== undefined) food.isAvailable = Boolean(isAvailable);

        if (removeSong) {
            food.song = undefined;
        } else if (req.body.song !== undefined) {
            let song;
            try { song = parseSong(req.body.song) } catch { return res.status(400).json({ message: "Invalid song data" }) }
            food.song = song;
        }

        await food.save({ validateModifiedOnly: true });
        res.json({ message: "Food updated successfully", food });
    } catch (error) {
        console.error('[updateFood] failed:', error);
        res.status(500).json({ message: error.message || "Could not update this food item" });
    }
}

async function getFoodItems(req, res) {
    const [foodItems, likes, saves, partnerRatingMap] = await Promise.all([
        foodModel.find({}).populate('foodPartner', 'name address profilePicture isOpen openingTime closingTime'),
        likeModel.find({ user: req.user._id }).select('food'),
        saveModel.find({ user: req.user._id }).select('food'),
        getPartnerRatingMap()
    ]);
    const liked = new Set(likes.map(item => String(item.food)));
    const saved = new Set(saves.map(item => String(item.food)));
    const commentCounts = await commentModel.aggregate([{ $group: { _id: '$food', count: { $sum: 1 } } }]);
    const commentCountMap = new Map(commentCounts.map(item => [String(item._id), item.count]));
    const reviewStats = await reviewModel.aggregate([{ $group: { _id: '$food', averageRating: { $avg: '$rating' }, reviewCount: { $sum: 1 } } }]);
    const reviewMap = new Map(reviewStats.map(item => [String(item._id), item]));
    const enrichedFoodItems = foodItems.map(item => {
        const stats = reviewMap.get(String(item._id));
        const object = item.toObject();
        const partnerRating = object.foodPartner ? partnerRatingMap.get(String(object.foodPartner._id)) : undefined;
        if (object.foodPartner) object.foodPartner = { ...object.foodPartner, averageRating: partnerRating?.averageRating || 0, reviewCount: partnerRating?.reviewCount || 0 };
        return { ...object, liked: liked.has(String(item._id)), saved: saved.has(String(item._id)), commentsCount: commentCountMap.get(String(item._id)) || 0, averageRating: stats ? Number(stats.averageRating.toFixed(1)) : 0, reviewCount: stats?.reviewCount || 0 };
    });
    res.status(200).json({
        message: "Food items fetched successfully",
        foodItems: enrichedFoodItems
    })
}


async function likeFood(req, res) {
    const { foodId } = req.body;
    const user = req.user;

    const isAlreadyLiked = await likeModel.findOne({
        user: user._id,
        food: foodId
    })

    if (isAlreadyLiked) {
        await likeModel.deleteOne({
            user: user._id,
            food: foodId
        })

        await foodModel.findByIdAndUpdate(foodId, {
            $inc: { likeCount: -1 }
        })

        const food = await foodModel.findById(foodId);
        return res.status(200).json({ message: "Food unliked successfully", liked: false, likeCount: Math.max(0, food?.likeCount ?? 0) })
    }

    const like = await likeModel.create({
        user: user._id,
        food: foodId
    })

    await foodModel.findByIdAndUpdate(foodId, {
        $inc: { likeCount: 1 }
    })

    const food = await foodModel.findById(foodId);
    res.status(201).json({
        message: "Food liked successfully",
        like,
        liked: true,
        likeCount: food?.likeCount || 1
    })

}

async function saveFood(req, res) {

    const { foodId } = req.body;
    const user = req.user;

    const isAlreadySaved = await saveModel.findOne({
        user: user._id,
        food: foodId
    })

    if (isAlreadySaved) {
        await saveModel.deleteOne({
            user: user._id,
            food: foodId
        })

        await foodModel.findByIdAndUpdate(foodId, {
            $inc: { savesCount: -1 }
        })

        const food = await foodModel.findById(foodId);
        return res.status(200).json({ message: "Food unsaved successfully", saved: false, savesCount: Math.max(0, food?.savesCount ?? 0) })
    }

    const save = await saveModel.create({
        user: user._id,
        food: foodId
    })

    await foodModel.findByIdAndUpdate(foodId, {
        $inc: { savesCount: 1 }
    })

    const food = await foodModel.findById(foodId);
    res.status(201).json({
        message: "Food saved successfully",
        save,
        saved: true,
        savesCount: food?.savesCount || 1
    })

}

async function getSaveFood(req, res) {

    const user = req.user;

    const savedFoods = await saveModel.find({ user: user._id }).populate({ path: 'food', populate: { path: 'foodPartner', select: 'name address profilePicture isOpen openingTime closingTime' } });
    const savedIds = savedFoods.map(item => item.food?._id).filter(Boolean);
    const [likes, commentCounts, savedReviewStats, partnerRatingMap] = await Promise.all([
        likeModel.find({ user: user._id, food: { $in: savedIds } }).select('food'),
        commentModel.aggregate([{ $match: { food: { $in: savedIds } } }, { $group: { _id: '$food', count: { $sum: 1 } } }]),
        reviewModel.aggregate([{ $match: { food: { $in: savedIds } } }, { $group: { _id: '$food', averageRating: { $avg: '$rating' }, reviewCount: { $sum: 1 } } }]),
        getPartnerRatingMap()
    ]);
    const liked = new Set(likes.map(item => String(item.food)));
    const commentCountMap = new Map(commentCounts.map(item => [String(item._id), item.count]));
    const savedReviewMap = new Map(savedReviewStats.map(item => [String(item._id), item]));
    const enrichedSavedFoods = savedFoods.map(item => {
        if (!item.food) return null;
        const foodId = String(item.food._id);
        const stats = savedReviewMap.get(foodId);
        const object = item.food.toObject();
        const partnerRating = object.foodPartner ? partnerRatingMap.get(String(object.foodPartner._id)) : undefined;
        if (object.foodPartner) object.foodPartner = { ...object.foodPartner, averageRating: partnerRating?.averageRating || 0, reviewCount: partnerRating?.reviewCount || 0 };
        return {
            ...object,
            liked: liked.has(foodId),
            saved: true,
            commentsCount: commentCountMap.get(foodId) || 0,
            averageRating: stats ? Number(stats.averageRating.toFixed(1)) : 0,
            reviewCount: stats?.reviewCount || 0
        };
    }).filter(Boolean);

    res.status(200).json({
        message: "Saved foods retrieved successfully",
        savedFoods: enrichedSavedFoods
    });
}

async function deleteFood(req, res) {
        const food = await foodModel.findOne({ _id: req.params.id, foodPartner: req.foodPartner._id });
        if (!food) return res.status(404).json({ message: "Food not found or not owned by you" });
        await Promise.all([
            foodModel.deleteOne({ _id: food._id }),
            likeModel.deleteMany({ food: food._id }),
            saveModel.deleteMany({ food: food._id })
        ]);
        return res.json({ message: "Food deleted successfully" });
}


module.exports = {
    createFood,
    updateFood,
    getFoodItems,
    likeFood,
    saveFood,
    getSaveFood,
    deleteFood
}
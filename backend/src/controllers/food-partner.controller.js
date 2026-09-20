const foodPartnerModel = require('../models/foodpartner.model');
const foodModel = require('../models/food.model');
const orderModel = require('../models/order.model');
const reviewModel = require('../models/review.model');
const commentModel = require('../models/comment.model');
const notifyRequestModel = require('../models/notifyRequest.model');
const notificationModel = require('../models/notification.model');
const storageService = require('../services/storage.service');
const mapService = require('../services/map.service');
const { v4: uuid } = require('uuid');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

async function getPartnerStats(foodPartnerId) {
    const foodItems = await foodModel.find({ foodPartner: foodPartnerId }).select('_id');
    const foodIds = foodItems.map(item => item._id);
    const [customersServed, reviewStats] = await Promise.all([
        orderModel.countDocuments({ food: { $in: foodIds }, paymentStatus: 'paid' }),
        reviewModel.aggregate([{ $match: { food: { $in: foodIds } } }, { $group: { _id: null, total: { $sum: '$rating' }, count: { $sum: 1 } } }])
    ]);
    const rating = reviewStats[0];
    return {
        customersServed,
        foodItemsServed: foodItems.length,
        averageRating: rating ? Number((rating.total / rating.count).toFixed(1)) : 0,
        reviewCount: rating?.count || 0
    };
}

async function enrichFoodItems(foodItems) {
    const foodIds = foodItems.map(item => item._id);
    const [reviewStats, commentCounts] = await Promise.all([
        reviewModel.aggregate([{ $match: { food: { $in: foodIds } } }, { $group: { _id: '$food', total: { $sum: '$rating' }, count: { $sum: 1 } } }]),
        commentModel.aggregate([{ $match: { food: { $in: foodIds } } }, { $group: { _id: '$food', count: { $sum: 1 } } }])
    ]);
    const reviewMap = new Map(reviewStats.map(item => [String(item._id), item]));
    const commentCountMap = new Map(commentCounts.map(item => [String(item._id), item.count]));
    return foodItems.map(item => {
        const stats = reviewMap.get(String(item._id));
        return {
            ...(item.toObject ? item.toObject() : item),
            averageRating: stats ? Number((stats.total / stats.count).toFixed(1)) : 0,
            reviewCount: stats?.count || 0,
            commentsCount: commentCountMap.get(String(item._id)) || 0
        };
    });
}

async function getFoodPartnerById(req, res) {

    const foodPartnerId = req.params.id;

    const foodPartner = await foodPartnerModel.findById(foodPartnerId).select('-password')
    if (!foodPartner) {
        return res.status(404).json({ message: "Food partner not found" });
    }

    const foodItemsByFoodPartner = await foodModel.find({ foodPartner: foodPartnerId })
    const stats = await getPartnerStats(foodPartnerId);

    res.status(200).json({
        message: "Food partner retrieved successfully",
        foodPartner: {
            ...foodPartner.toObject(),
            foodItems: await enrichFoodItems(foodItemsByFoodPartner)
            , ...stats
        }

    });
}

async function listFoodPartners(req, res) {
    const distanceMap = await mapService.getPartnersWithinServiceRadius(req.user.location?.coordinates);

    const query = distanceMap ? { _id: { $in: [...distanceMap.keys()] } } : {};
    const partners = await foodPartnerModel.find(query).select('-password').lean();
    const foods = await foodModel.find({}).select('_id foodPartner').lean();

    const foodIdsByPartner = new Map();
    foods.forEach(food => {
        const key = String(food.foodPartner);
        if (!foodIdsByPartner.has(key)) foodIdsByPartner.set(key, []);
        foodIdsByPartner.get(key).push(food._id);
    });

    const [orderCounts, reviewStats] = await Promise.all([
        orderModel.aggregate([{ $match: { paymentStatus: 'paid' } }, { $group: { _id: '$food', count: { $sum: 1 } } }]),
        reviewModel.aggregate([{ $group: { _id: '$food', total: { $sum: '$rating' }, count: { $sum: 1 } } }])
    ]);
    const orderCountMap = new Map(orderCounts.map(item => [String(item._id), item.count]));
    const reviewMap = new Map(reviewStats.map(item => [String(item._id), item]));

    const foodPartners = partners.map(partner => {
        const foodIds = foodIdsByPartner.get(String(partner._id)) || [];
        let customersServed = 0;
        let reviewTotal = 0;
        let reviewCount = 0;
        foodIds.forEach(foodId => {
            customersServed += orderCountMap.get(String(foodId)) || 0;
            const stats = reviewMap.get(String(foodId));
            if (stats) { reviewTotal += stats.total; reviewCount += stats.count; }
        });
        return {
            ...partner,
            totalMeals: foodIds.length,
            customersServed,
            reviewCount,
            averageRating: reviewCount ? Number((reviewTotal / reviewCount).toFixed(1)) : 0,
            distanceKm: distanceMap?.get(String(partner._id))
        };
    });

    res.json({ foodPartners, hasUserLocation: Boolean(distanceMap) });
}

async function getMyProfile(req, res) {
    const foodItems = await foodModel.find({ foodPartner: req.foodPartner._id });
    const stats = await getPartnerStats(req.foodPartner._id);
    res.json({ foodPartner: { ...req.foodPartner.toObject(), password: undefined, foodItems: await enrichFoodItems(foodItems), ...stats } });
}

async function updateHours(req, res) {
    try {
        const { isOpen, openingTime, closingTime } = req.body;
        const partner = await foodPartnerModel.findById(req.foodPartner._id);
        if (!partner) return res.status(404).json({ message: 'Food partner account not found' });

        const wasClosed = partner.isOpen === false;
        if (isOpen !== undefined) partner.isOpen = Boolean(isOpen);
        if (openingTime !== undefined) partner.openingTime = openingTime;
        if (closingTime !== undefined) partner.closingTime = closingTime;
        await partner.save({ validateModifiedOnly: true });

        if (wasClosed && partner.isOpen) {
            const pending = await notifyRequestModel.find({ foodPartner: partner._id, fulfilled: false });
            if (pending.length) {
                await notificationModel.insertMany(pending.map(request => ({ user: request.user, message: `${partner.name} is now open! Place your order.` })));
                await notifyRequestModel.updateMany({ _id: { $in: pending.map(request => request._id) } }, { fulfilled: true });
            }
        }

        res.json({ foodPartner: { ...partner.toObject(), password: undefined } });
    } catch (error) {
        console.error('[updateHours] failed:', error);
        res.status(500).json({ message: error.message || 'Could not update restaurant hours' });
    }
}

async function updateProfile(req, res) {
    try {
        const { name, contactName, phone, address: addressText, restaurantType, email, packagingCharge, lat, lng } = req.body;
        const partner = await foodPartnerModel.findById(req.foodPartner._id);
        if (!partner) return res.status(404).json({ message: 'Food partner account not found' });

        if (email && email !== partner.email) {
            if (!EMAIL_REGEX.test(email)) return res.status(400).json({ message: 'Please enter a valid email address' });
            const emailTaken = await foodPartnerModel.findOne({ email, _id: { $ne: partner._id } });
            if (emailTaken) return res.status(400).json({ message: 'Email already in use' });
            partner.email = email;
        }
        if (name?.trim()) partner.name = name.trim();
        if (contactName?.trim()) partner.contactName = contactName.trim();
        if (phone?.trim()) partner.phone = phone.trim();
        // Location is now GPS/Maps-link only (confirmed via PinConfirmMap) — no free-text
        // address to geocode. Only touches location when the caller actually re-confirmed a
        // pin this time; editing unrelated fields (phone, hours, etc.) doesn't force a re-pin.
        // The address text is a single editable field on the frontend (pre-filled from a Maps
        // link's own address when available) — whatever's submitted is trusted and saved as-is.
        const hasPin = Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));
        if (hasPin) {
            partner.location = { type: 'Point', coordinates: [Number(lng), Number(lat)] };
            partner.address = addressText?.trim() || `Pinned location (${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)})`;
        }
        if (restaurantType) partner.restaurantType = restaurantType;
        if (packagingCharge !== undefined) {
            const charge = Number(packagingCharge);
            if (!Number.isFinite(charge) || charge < 0) return res.status(400).json({ message: 'Packaging charge must be a non-negative number' });
            partner.packagingCharge = charge;
        }
        if (req.file) partner.profilePicture = (await storageService.uploadFile(req.file.buffer, `profile-${uuid()}`)).url;

        await partner.save({ validateModifiedOnly: true });
        res.json({ foodPartner: { ...partner.toObject(), password: undefined } });
    } catch (error) {
        console.error('[updateProfile] failed:', error);
        res.status(500).json({ message: error.message || 'Could not update your profile' });
    }
}

async function notifyMe(req, res) {
    const foodPartner = await foodPartnerModel.findById(req.params.id).select('isOpen');
    if (!foodPartner) return res.status(404).json({ message: 'Food partner not found' });
    if (foodPartner.isOpen) return res.status(400).json({ message: 'This restaurant is already open' });
    await notifyRequestModel.findOneAndUpdate({ user: req.user._id, foodPartner: req.params.id }, { fulfilled: false }, { upsert: true, setDefaultsOnInsert: true });
    res.json({ message: "We'll notify you when this restaurant opens." });
}

module.exports = {
    getFoodPartnerById,
    listFoodPartners,
    getMyProfile,
    updateProfile,
    updateHours,
    notifyMe
};
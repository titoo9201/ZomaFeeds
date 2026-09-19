const orderModel = require('../models/order.model');
const foodModel = require('../models/food.model');
const foodPartnerModel = require('../models/foodpartner.model');
const mailService = require('../services/mail.service');

const FOOD_POPULATE = { path: 'food', select: 'name video description price foodPartner', populate: { path: 'foodPartner', select: 'name isOpen openingTime closingTime' } };

async function createOrder(req, res) {
    const { food, quantity, address } = req.body;
    const foodItem = await foodModel.findById(food);
    if (!foodItem) return res.status(404).json({ message: 'Food not found' });
    if (!foodItem.isAvailable) return res.status(409).json({ message: 'This item is currently unavailable' });
    const foodPartner = await foodPartnerModel.findById(foodItem.foodPartner).select('isOpen');
    if (!foodPartner?.isOpen) return res.status(409).json({ message: 'This restaurant is currently closed', foodPartnerId: foodItem.foodPartner });
    if (!Number.isInteger(Number(quantity)) || Number(quantity) < 1 || !address?.trim()) return res.status(400).json({ message: 'Quantity and delivery address are required' });
    const order = await orderModel.create({ user: req.user._id, food, quantity: Number(quantity), address: address.trim(), total: Number(quantity) * foodItem.price });
    await order.populate(FOOD_POPULATE);
    res.status(201).json({ order });
}

async function getMyOrders(req, res) {
    const orders = await orderModel.find({ user: req.user._id }).populate(FOOD_POPULATE).sort({ createdAt: -1 });
    res.json({ orders });
}

async function getOrder(req, res) {
    const order = await orderModel.findOne({ _id: req.params.id, user: req.user._id }).populate(FOOD_POPULATE);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({ order });
}

async function payOrder(req, res) {
    const { paymentMethod } = req.body;
    if (!['upi', 'card', 'cod'].includes(paymentMethod)) return res.status(400).json({ message: 'A valid payment method (upi, card, or cod) is required' });
    const paymentStatus = paymentMethod === 'cod' ? 'unpaid' : 'paid';
    // Status stays 'pending' here: the restaurant still has to accept the order (see respondToOrder).
    const order = await orderModel.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { paymentMethod, paymentStatus }, { new: true }).populate(FOOD_POPULATE);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({ order, message: paymentMethod === 'cod' ? 'Order placed for cash on delivery' : 'Dummy payment completed' });
}

const MAX_HISTORY_DAYS = 180; // ~6 months; older history is by request to support, not self-serve

async function getPartnerOrders(req, res) {
    const foodIds = (await foodModel.find({ foodPartner: req.foodPartner._id }).select('_id')).map(item => item._id);

    const requestedDays = Number(req.query.days) || 30;
    const rangeDays = Math.min(Math.max(requestedDays, 1), MAX_HISTORY_DAYS);

    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const startOfYesterday = new Date(startOfToday); startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const startOfLast30Days = new Date(startOfToday); startOfLast30Days.setDate(startOfLast30Days.getDate() - 30);
    // Stats always look back at least 30 days regardless of the chosen history range, so pick the wider window to fetch once.
    const fetchFrom = new Date(startOfToday); fetchFrom.setDate(fetchFrom.getDate() - Math.max(rangeDays, 30));

    const orders = await orderModel.find({ food: { $in: foodIds }, paymentMethod: { $exists: true }, createdAt: { $gte: fetchFrom } })
        .populate('food', 'name video')
        .populate('user', 'fullName')
        .sort({ createdAt: -1 });

    const isServed = order => ['preparing', 'out_for_delivery', 'delivered'].includes(order.status);
    const bucketStats = list => ({
        served: list.filter(isServed).length,
        revenue: list.filter(order => order.paymentStatus === 'paid').reduce((sum, order) => sum + order.total, 0)
    });

    const today = orders.filter(order => order.createdAt >= startOfToday);
    const yesterday = orders.filter(order => order.createdAt >= startOfYesterday && order.createdAt < startOfToday);
    const withinRange = orders.filter(order => order.createdAt >= new Date(startOfToday.getTime() - rangeDays * 86400000));
    const past = withinRange.filter(order => order.createdAt < startOfYesterday);
    const last30Days = orders.filter(order => order.createdAt >= startOfLast30Days);

    res.json({
        today,
        yesterday,
        past,
        stats: { today: bucketStats(today), yesterday: bucketStats(yesterday), last30Days: bucketStats(last30Days) },
        rangeDays,
        maxHistoryDays: MAX_HISTORY_DAYS
    });
}

async function respondToOrder(req, res) {
    const { decision, reason } = req.body;
    if (!['accept', 'reject'].includes(decision)) return res.status(400).json({ message: 'Decision must be accept or reject' });
    const foodIds = (await foodModel.find({ foodPartner: req.foodPartner._id }).select('_id')).map(item => item._id);
    const order = await orderModel.findOne({ _id: req.params.id, food: { $in: foodIds } });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status !== 'pending') return res.status(400).json({ message: 'This order has already been responded to' });

    if (decision === 'accept') {
        order.status = 'preparing';
    } else {
        if (!reason?.trim()) return res.status(400).json({ message: 'A reason is required to reject an order' });
        order.status = 'cancelled';
        order.cancellationReason = reason.trim();
        if (order.paymentStatus === 'paid') order.paymentStatus = 'refunded';
    }
    await order.save();
    await order.populate([FOOD_POPULATE, { path: 'user', select: 'email fullName' }]);

    if (decision === 'accept') {
        mailService.sendOrderBillEmail(order.user.email, order).catch(error => console.error('[mail] order bill email failed:', error.message));
    }

    res.json({ order });
}

const NEXT_STATUS = { preparing: 'out_for_delivery', out_for_delivery: 'delivered' };

async function advanceOrderStatus(req, res) {
    const foodIds = (await foodModel.find({ foodPartner: req.foodPartner._id }).select('_id')).map(item => item._id);
    const order = await orderModel.findOne({ _id: req.params.id, food: { $in: foodIds } });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const next = NEXT_STATUS[order.status];
    if (!next) return res.status(400).json({ message: `Cannot advance an order from status "${order.status}"` });
    order.status = next;
    await order.save();
    await order.populate([FOOD_POPULATE, { path: 'user', select: 'email fullName' }]);

    if (next === 'out_for_delivery') {
        mailService.sendOrderOutForDeliveryEmail(order.user.email, order).catch(error => console.error('[mail] out-for-delivery email failed:', error.message));
    } else if (next === 'delivered') {
        mailService.sendOrderDeliveredEmail(order.user.email, order).catch(error => console.error('[mail] delivered email failed:', error.message));
    }

    res.json({ order });
}

module.exports = { createOrder, getMyOrders, getOrder, payOrder, getPartnerOrders, respondToOrder, advanceOrderStatus };

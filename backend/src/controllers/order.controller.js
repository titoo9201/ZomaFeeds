const orderModel = require('../models/order.model');
const foodModel = require('../models/food.model');
const foodPartnerModel = require('../models/foodpartner.model');
const notificationModel = require('../models/notification.model');
const mailService = require('../services/mail.service');
const mapService = require('../services/map.service');
const pricingService = require('../services/pricing.service');
const { DEFAULT_DELIVERY_FEE } = require('../config/pricingConfig');
const { getIO, getRiderSocketId } = require('../socket');

const FOOD_POPULATE = { path: 'food', select: 'name video description price foodPartner', populate: { path: 'foodPartner', select: 'name isOpen openingTime closingTime address phone' } };
const RIDER_POPULATE = { path: 'rider', select: 'name phone vehicleNumber profilePicture currentLocation' };

// Food partners don't have a stored geocoded location yet, so the restaurant's address is geocoded here too.
// geocodeWithFallback retries with progressively coarser (less specific) portions of the address,
// since Nominatim often can't resolve a house number/society name but can resolve the city/pincode.
async function calculateDeliveryQuote({ foodPartner, address }) {
    const [dropLocation, pickupLocation] = await Promise.all([
        mapService.geocodeWithFallback(address.trim()),
        mapService.geocodeWithFallback(foodPartner.address)
    ]);

    let distanceKm = null;
    if (pickupLocation && dropLocation) {
        const route = await mapService.getRoute(pickupLocation, dropLocation);
        if (route) distanceKm = Number((route.distance / 1000).toFixed(2));
    }

    let deliveryFee = pricingService.calculateDeliveryFee(distanceKm);
    // Address genuinely couldn't be geocoded even after the fallback chain — don't block the
    // order over it, charge a standard delivery fee instead. A confirmed too-far distance still
    // gets rejected below (that's a real business rule, not a geocoding hiccup).
    if (deliveryFee == null && distanceKm == null) deliveryFee = DEFAULT_DELIVERY_FEE;

    return { dropLocation, pickupLocation, distanceKm, deliveryFee };
}

function deliveryQuoteErrorMessage() {
    return "This address is outside the restaurant's delivery range.";
}

async function quoteOrder(req, res) {
    try {
        const { food, quantity, address } = req.body;
        if (!address?.trim()) return res.status(400).json({ message: 'Address is required' });
        const foodItem = await foodModel.findById(food);
        if (!foodItem) return res.status(404).json({ message: 'Food not found' });
        const foodPartner = await foodPartnerModel.findById(foodItem.foodPartner).select('address packagingCharge');
        if (!foodPartner) return res.status(404).json({ message: 'Restaurant not found' });

        const { distanceKm, deliveryFee } = await calculateDeliveryQuote({ foodPartner, address });
        if (deliveryFee == null) return res.status(409).json({ message: deliveryQuoteErrorMessage() });

        const itemsTotal = Math.max(1, Number(quantity) || 1) * foodItem.price;
        const bill = pricingService.computeBill(itemsTotal, deliveryFee, foodPartner.packagingCharge || 0);
        res.json({ bill: { ...bill, distanceKm } });
    } catch (error) {
        console.error('[quoteOrder] failed:', error);
        res.status(500).json({ message: error.message || 'Could not calculate the bill right now' });
    }
}

async function createOrder(req, res) {
    try {
        const { food, quantity, address } = req.body;
        const foodItem = await foodModel.findById(food);
        if (!foodItem) return res.status(404).json({ message: 'Food not found' });
        if (!foodItem.isAvailable) return res.status(409).json({ message: 'This item is currently unavailable' });
        const foodPartner = await foodPartnerModel.findById(foodItem.foodPartner).select('isOpen address packagingCharge');
        if (!foodPartner?.isOpen) return res.status(409).json({ message: 'This restaurant is currently closed', foodPartnerId: foodItem.foodPartner });
        if (!Number.isInteger(Number(quantity)) || Number(quantity) < 1 || !address?.trim()) return res.status(400).json({ message: 'Quantity and delivery address are required' });

        const { dropLocation, pickupLocation, distanceKm, deliveryFee } = await calculateDeliveryQuote({ foodPartner, address });
        if (deliveryFee == null) return res.status(409).json({ message: deliveryQuoteErrorMessage() });

        const itemsTotal = Number(quantity) * foodItem.price;
        const bill = pricingService.computeBill(itemsTotal, deliveryFee, foodPartner.packagingCharge || 0);

        const order = await orderModel.create({
            user: req.user._id, food, quantity: Number(quantity), address: address.trim(),
            total: bill.grandTotal, deliveryFee, distanceKm, dropLocation, pickupLocation,
            billBreakdown: {
                itemsTotal: bill.itemsTotal, restaurantGST: bill.restaurantGST, packagingCharge: bill.packagingCharge,
                platformFee: bill.platformFee, serviceGST: bill.serviceGST
            }
        });
        await order.populate(FOOD_POPULATE);
        res.status(201).json({ order });
    } catch (error) {
        console.error('[createOrder] failed:', error);
        res.status(500).json({ message: error.message || 'Could not place this order' });
    }
}

async function getMyOrders(req, res) {
    const orders = await orderModel.find({ user: req.user._id }).populate([FOOD_POPULATE, RIDER_POPULATE]).sort({ createdAt: -1 });
    res.json({ orders });
}

async function getOrder(req, res) {
    const order = await orderModel.findOne({ _id: req.params.id, user: req.user._id }).populate([FOOD_POPULATE, RIDER_POPULATE]);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({ order });
}

async function payOrder(req, res) {
    const { paymentMethod } = req.body;
    if (!['upi', 'card', 'cod'].includes(paymentMethod)) return res.status(400).json({ message: 'A valid payment method (upi, card, or cod) is required' });
    const paymentStatus = paymentMethod === 'cod' ? 'unpaid' : 'paid';
    const order = await orderModel.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { paymentMethod, paymentStatus }, { new: true }).populate(FOOD_POPULATE);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({ order, message: paymentMethod === 'cod' ? 'Order placed for cash on delivery' : 'Dummy payment completed' });
}

const MAX_HISTORY_DAYS = 180;

async function getPartnerOrders(req, res) {
    const foodIds = (await foodModel.find({ foodPartner: req.foodPartner._id }).select('_id')).map(item => item._id);

    const requestedDays = Number(req.query.days) || 30;
    const rangeDays = Math.min(Math.max(requestedDays, 1), MAX_HISTORY_DAYS);

    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const startOfYesterday = new Date(startOfToday); startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const startOfLast30Days = new Date(startOfToday); startOfLast30Days.setDate(startOfLast30Days.getDate() - 30);
    const fetchFrom = new Date(startOfToday); fetchFrom.setDate(fetchFrom.getDate() - Math.max(rangeDays, 30));

    const orders = await orderModel.find({ food: { $in: foodIds }, paymentMethod: { $exists: true }, createdAt: { $gte: fetchFrom } })
        .populate('food', 'name video')
        .populate('user', 'fullName')
        .populate('rider', 'name phone vehicleNumber')
        .sort({ createdAt: -1 });

    const isServed = order => ['preparing', 'out_for_delivery', 'delivered'].includes(order.status);
    const bucketStats = list => ({
        served: list.filter(isServed).length,
        revenue: list.filter(order => order.paymentStatus === 'paid').reduce((sum, order) => sum + (order.billBreakdown?.itemsTotal || order.total), 0)
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
        const io = getIO();
        if (io) io.to('riders_lobby').emit('order:new', order);
    }

    res.json({ order });
}

const NEXT_STATUS = { preparing: 'out_for_delivery', out_for_delivery: 'delivered' };

async function advanceOrderStatus(req, res) {
    const foodIds = (await foodModel.find({ foodPartner: req.foodPartner._id }).select('_id')).map(item => item._id);
    const order = await orderModel.findOne({ _id: req.params.id, food: { $in: foodIds } });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.rider) return res.status(400).json({ message: 'This order is being handled by a delivery rider' });
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

async function startDelivery(req, res) {
    try {
        const order = await orderModel.findOneAndUpdate(
            { _id: req.params.id, rider: req.rider._id, riderStatus: 'picked_up' },
            { riderStatus: 'out_for_delivery', status: 'out_for_delivery' },
            { new: true }
        );
        if (!order) return res.status(404).json({ message: 'Order not found or not picked up yet' });
        await order.populate([FOOD_POPULATE, { path: 'user', select: 'email fullName' }]);

        mailService.sendOrderOutForDeliveryEmail(order.user.email, order).catch(error => console.error('[mail] out-for-delivery email failed:', error.message));

        const io = getIO();
        if (io) io.to(`order_${order._id}`).emit('order:updated', order);

        res.json({ order });
    } catch (error) {
        console.error('[startDelivery] failed:', error);
        res.status(500).json({ message: error.message || 'Could not start this delivery' });
    }
}

async function getAvailableOrders(req, res) {
    try {
        const orders = await orderModel.find({ status: 'preparing', rider: null })
            .populate(FOOD_POPULATE)
            .sort({ createdAt: -1 });
        res.json({ orders });
    } catch (error) {
        console.error('[getAvailableOrders] failed:', error);
        res.status(500).json({ message: error.message || 'Could not load available orders' });
    }
}

async function getActiveRiderOrder(req, res) {
    try {
        const order = await orderModel.findOne({ rider: req.rider._id, riderStatus: { $in: ['assigned', 'picked_up', 'out_for_delivery'] } })
            .populate([FOOD_POPULATE, { path: 'user', select: 'fullName phone' }]);
        res.json({ order: order || null });
    } catch (error) {
        console.error('[getActiveRiderOrder] failed:', error);
        res.status(500).json({ message: error.message || 'Could not load your active delivery' });
    }
}

async function acceptDelivery(req, res) {
    try {
        const order = await orderModel.findOneAndUpdate(
            { _id: req.params.id, status: 'preparing', rider: null },
            { rider: req.rider._id, riderStatus: 'assigned' },
            { new: true }
        );
        if (!order) return res.status(409).json({ message: 'This order has already been claimed or is not available' });
        await order.populate([FOOD_POPULATE, { path: 'user', select: 'email fullName phone' }, RIDER_POPULATE]);

        const io = getIO();
        if (io) {
            io.to('riders_lobby').emit('order:assigned', { orderId: String(order._id) });
            const riderSocketId = getRiderSocketId(req.rider._id);
            if (riderSocketId) io.to(riderSocketId).emit('order:assigned', { orderId: String(order._id), order });
            io.to(`order_${order._id}`).emit('order:updated', order);
        }

        res.json({ order });
    } catch (error) {
        console.error('[acceptDelivery] failed:', error);
        res.status(500).json({ message: error.message || 'Could not accept this delivery' });
    }
}

async function pickupOrder(req, res) {
    try {
        const order = await orderModel.findOneAndUpdate(
            { _id: req.params.id, rider: req.rider._id, riderStatus: 'assigned' },
            { riderStatus: 'picked_up' },
            { new: true }
        );
        if (!order) return res.status(404).json({ message: 'Order not found or not assigned to you' });
        await order.populate([FOOD_POPULATE, { path: 'user', select: 'email fullName' }]);

        notificationModel.create({ user: order.user._id, message: `Your order for ${order.food?.name || 'your food'} has been picked up and will be on its way soon.` }).catch(error => console.error('[notification] pickup notification failed:', error.message));

        const io = getIO();
        if (io) io.to(`order_${order._id}`).emit('order:updated', order);

        res.json({ order });
    } catch (error) {
        console.error('[pickupOrder] failed:', error);
        res.status(500).json({ message: error.message || 'Could not mark this order as picked up' });
    }
}

async function deliverOrder(req, res) {
    try {
        const order = await orderModel.findOne({ _id: req.params.id, rider: req.rider._id, riderStatus: 'out_for_delivery' });
        if (!order) return res.status(404).json({ message: 'Order not found or not out for delivery yet' });

        if (order.paymentMethod === 'cod' && order.paymentStatus !== 'paid') return res.status(400).json({ message: 'Waiting for the customer to confirm the cash payment' });

        const distance = mapService.distanceMeters(req.rider.currentLocation, order.dropLocation);
        if (distance > mapService.ARRIVAL_THRESHOLD_METERS) return res.status(400).json({ message: "You need to be at the customer's location to complete delivery" });

        order.riderStatus = 'delivered';
        order.status = 'delivered';
        await order.save();

        const deliveredOrder = await orderModel.findById(order._id).populate([FOOD_POPULATE, { path: 'user', select: 'email fullName' }]);

        mailService.sendOrderDeliveredEmail(deliveredOrder.user.email, deliveredOrder).catch(error => console.error('[mail] delivered email failed:', error.message));

        const io = getIO();
        if (io) io.to(`order_${order._id}`).emit('order:updated', deliveredOrder);

        res.json({ order: deliveredOrder });
    } catch (error) {
        console.error('[deliverOrder] failed:', error);
        res.status(500).json({ message: error.message || 'Could not mark this order as delivered' });
    }
}

async function confirmCodPayment(req, res) {
    try {
        const order = await orderModel.findOne({ _id: req.params.id, user: req.user._id }).populate('rider', 'currentLocation');
        if (!order) return res.status(404).json({ message: 'Order not found' });
        if (order.paymentMethod !== 'cod') return res.status(400).json({ message: 'This order is not cash on delivery' });
        if (order.paymentStatus === 'paid') return res.status(400).json({ message: 'This order is already marked as paid' });
        if (order.riderStatus !== 'out_for_delivery') return res.status(400).json({ message: 'Your delivery partner is not out for delivery yet' });

        const distance = mapService.distanceMeters(order.rider?.currentLocation, order.dropLocation);
        if (distance > mapService.ARRIVAL_THRESHOLD_METERS) return res.status(400).json({ message: "Your delivery partner hasn't arrived yet" });

        order.paymentStatus = 'paid';
        await order.save();
        await order.populate([FOOD_POPULATE, RIDER_POPULATE]);

        const io = getIO();
        if (io) io.to(`order_${order._id}`).emit('order:updated', order);

        res.json({ order });
    } catch (error) {
        console.error('[confirmCodPayment] failed:', error);
        res.status(500).json({ message: error.message || 'Could not confirm payment right now' });
    }
}

async function getOrderRoute(req, res) {
    try {
        const order = await orderModel.findById(req.params.id).populate('rider', 'currentLocation');
        if (!order) return res.status(404).json({ message: 'Order not found' });

        const isOwner = (req.user && String(order.user) === String(req.user._id)) || (req.rider && order.rider && String(order.rider._id) === String(req.rider._id));
        if (!isOwner) return res.status(403).json({ message: 'Access denied' });

        if (!order.rider?.currentLocation?.lat) return res.status(404).json({ message: 'Rider location not available yet' });
        const destination = order.riderStatus === 'assigned' ? order.pickupLocation : order.dropLocation;
        if (!destination?.lat) return res.status(404).json({ message: 'Destination location not available' });

        const route = await mapService.getRoute(order.rider.currentLocation, destination);
        if (!route) return res.status(502).json({ message: 'Could not calculate route right now' });

        res.json({ route });
    } catch (error) {
        console.error('[getOrderRoute] failed:', error);
        res.status(500).json({ message: error.message || 'Could not calculate route right now' });
    }
}

module.exports = {
    createOrder, quoteOrder, getMyOrders, getOrder, payOrder, getPartnerOrders, respondToOrder, advanceOrderStatus,
    getAvailableOrders, getActiveRiderOrder, acceptDelivery, pickupOrder, startDelivery, deliverOrder,
    confirmCodPayment, getOrderRoute
};

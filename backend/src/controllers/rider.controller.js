const riderModel = require('../models/rider.model');
const orderModel = require('../models/order.model');
const bcrypt = require('bcryptjs');
const otpService = require('../services/otp.service');
const storageService = require('../services/storage.service');
const { v4: uuid } = require('uuid');
const { getIO, setRiderOnline } = require('../socket');
const { setAuthCookie, clearAuthCookie } = require('../utils/authCookie');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

async function registerRider(req, res) {
    try {
        const { name, email, password, otp, phone, vehicleNumber } = req.body;

        if (!EMAIL_REGEX.test(email || '')) return res.status(400).json({ message: 'Please enter a valid email address' });
        if (!password && !otp) return res.status(400).json({ message: 'Provide a password or an OTP to register' });
        if (!phone?.trim() || !vehicleNumber?.trim()) return res.status(400).json({ message: 'Phone and vehicle number are required' });

        const existingRider = await riderModel.findOne({ email });
        if (existingRider) return res.status(400).json({ message: 'Rider account already exists' });

        let hashedPassword;
        if (otp) {
            const isOtpValid = await otpService.verifyOtp({ email, role: 'rider', purpose: 'register', otp });
            if (!isOtpValid) return res.status(400).json({ message: 'Invalid or expired OTP' });
        } else {
            hashedPassword = await bcrypt.hash(password, 10);
        }

        const uploaded = req.file ? await storageService.uploadFile(req.file.buffer, `profile-${uuid()}`) : null;
        const rider = await riderModel.create({ name, email, password: hashedPassword, phone: phone.trim(), vehicleNumber: vehicleNumber.trim(), profilePicture: uploaded?.url, profilePictureFileId: uploaded?.fileId });

        setAuthCookie(res, rider._id, 'rider');

        res.status(201).json({
            message: "Rider registered successfully",
            rider: { _id: rider._id, email: rider.email, name: rider.name, phone: rider.phone, vehicleNumber: rider.vehicleNumber, profilePicture: rider.profilePicture, isOnline: rider.isOnline }
        })
    } catch (error) {
        console.error('[registerRider] failed:', error);
        res.status(500).json({ message: error.message || 'Could not register right now' });
    }
}

async function loginRider(req, res) {
    try {
        const { email, password, otp } = req.body;
        const rider = await riderModel.findOne({ email })
        if (!rider) return res.status(400).json({ message: "Invalid email or password" })

        if (otp) {
            const isOtpValid = await otpService.verifyOtp({ email, role: 'rider', purpose: 'login', otp });
            if (!isOtpValid) return res.status(400).json({ message: 'Invalid or expired OTP' });
        } else {
            if (!rider.password) return res.status(400).json({ message: 'This account has no password set. Log in with an OTP instead.' });
            const isPasswordValid = await bcrypt.compare(password || '', rider.password);
            if (!isPasswordValid) return res.status(400).json({ message: "Invalid email or password" });
        }

        setAuthCookie(res, rider._id, 'rider');

        res.status(200).json({
            message: "Rider logged in successfully",
            rider: { _id: rider._id, email: rider.email, name: rider.name, phone: rider.phone, vehicleNumber: rider.vehicleNumber, profilePicture: rider.profilePicture, isOnline: rider.isOnline }
        })
    } catch (error) {
        console.error('[loginRider] failed:', error);
        res.status(500).json({ message: error.message || 'Could not log in right now' });
    }
}

function logoutRider(req, res) {
    clearAuthCookie(res);
    res.status(200).json({ message: "Rider logged out successfully" });
}

async function updateStatus(req, res) {
    try {
        const { isOnline } = req.body;
        const rider = await riderModel.findByIdAndUpdate(req.rider._id, { isOnline: Boolean(isOnline) }, { new: true });
        setRiderOnline(rider._id, rider.isOnline);
        res.json({ rider: { _id: rider._id, isOnline: rider.isOnline } });
    } catch (error) {
        console.error('[updateStatus] failed:', error);
        res.status(500).json({ message: error.message || 'Could not update your status' });
    }
}

const RIDER_STATS_RANGE_DAYS = 30;

async function getRiderStats(riderId) {
    const delivered = await orderModel.find({ rider: riderId, status: 'delivered' }).select('deliveryFee updatedAt');

    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const startOfYesterday = new Date(startOfToday); startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const startOfRange = new Date(startOfToday); startOfRange.setDate(startOfRange.getDate() - RIDER_STATS_RANGE_DAYS);

    const bucket = list => ({
        deliveries: list.length,
        earnings: Number(list.reduce((sum, order) => sum + (order.deliveryFee || 0), 0).toFixed(2))
    });

    const today = delivered.filter(order => order.updatedAt >= startOfToday);
    const yesterday = delivered.filter(order => order.updatedAt >= startOfYesterday && order.updatedAt < startOfToday);
    const past = delivered.filter(order => order.updatedAt >= startOfRange && order.updatedAt < startOfYesterday);

    return {
        deliveriesCompleted: delivered.length,
        totalRevenue: Number(delivered.reduce((sum, order) => sum + (order.deliveryFee || 0), 0).toFixed(2)),
        stats: { today: bucket(today), yesterday: bucket(yesterday), past: bucket(past) }
    };
}

async function getMyProfile(req, res) {
    try {
        const stats = await getRiderStats(req.rider._id);
        res.json({ rider: { ...req.rider.toObject(), password: undefined, ...stats } });
    } catch (error) {
        console.error('[getMyProfile] failed:', error);
        res.status(500).json({ message: error.message || 'Could not load your profile' });
    }
}

async function updateProfile(req, res) {
    try {
        const { name, phone, vehicleNumber, email } = req.body;
        const rider = await riderModel.findById(req.rider._id);
        if (!rider) return res.status(404).json({ message: 'Rider account not found' });

        if (email && email !== rider.email) {
            if (!EMAIL_REGEX.test(email)) return res.status(400).json({ message: 'Please enter a valid email address' });
            const emailTaken = await riderModel.findOne({ email, _id: { $ne: rider._id } });
            if (emailTaken) return res.status(400).json({ message: 'Email already in use' });
            rider.email = email;
        }
        if (name?.trim()) rider.name = name.trim();
        if (phone?.trim()) rider.phone = phone.trim();
        if (vehicleNumber?.trim()) rider.vehicleNumber = vehicleNumber.trim();

        const oldProfilePictureFileId = rider.profilePictureFileId;
        if (req.file) {
            const uploaded = await storageService.uploadFile(req.file.buffer, `profile-${uuid()}`);
            rider.profilePicture = uploaded.url;
            rider.profilePictureFileId = uploaded.fileId;
        }

        await rider.save({ validateModifiedOnly: true });
        // Free up the old picture's cloud storage only after the new one is safely saved.
        if (req.file && oldProfilePictureFileId) await storageService.deleteFile(oldProfilePictureFileId);
        const stats = await getRiderStats(rider._id);
        res.json({ rider: { ...rider.toObject(), password: undefined, ...stats } });
    } catch (error) {
        console.error('[updateProfile] failed:', error);
        res.status(500).json({ message: error.message || 'Could not update your profile' });
    }
}

async function updateLocation(req, res) {
    try {
        const { lat, lng } = req.body;
        if (typeof lat !== 'number' || typeof lng !== 'number') return res.status(400).json({ message: 'lat and lng are required' });

        const updatedAt = new Date();
        const rider = await riderModel.findByIdAndUpdate(req.rider._id, { currentLocation: { lat, lng, updatedAt } }, { new: true });

        const io = getIO();
        if (io) {
            const activeOrder = await orderModel.findOne({ rider: rider._id, riderStatus: { $in: ['assigned', 'picked_up'] } }).select('_id');
            if (activeOrder) io.to(`order_${activeOrder._id}`).emit('rider:location', { lat, lng, updatedAt });
        }

        res.json({ rider: { _id: rider._id, currentLocation: rider.currentLocation } });
    } catch (error) {
        console.error('[updateLocation] failed:', error);
        res.status(500).json({ message: error.message || 'Could not update your location' });
    }
}

module.exports = {
    registerRider,
    loginRider,
    logoutRider,
    getMyProfile,
    updateProfile,
    updateStatus,
    updateLocation
};

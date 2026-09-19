const notificationModel = require('../models/notification.model');

async function getMyNotifications(req, res) {
    const notifications = await notificationModel.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
    res.json({ notifications });
}

async function markRead(req, res) {
    const notification = await notificationModel.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { read: true }, { new: true });
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.json({ notification });
}

module.exports = { getMyNotifications, markRead };

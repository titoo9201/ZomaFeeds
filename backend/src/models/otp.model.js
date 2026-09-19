const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    email: { type: String, required: true },
    role: { type: String, enum: ['user', 'foodPartner'], required: true },
    purpose: { type: String, enum: ['register', 'login'], required: true },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 }
}, { timestamps: true });

otpSchema.index({ email: 1, role: 1, purpose: 1 }, { unique: true });

module.exports = mongoose.model('otp', otpSchema);

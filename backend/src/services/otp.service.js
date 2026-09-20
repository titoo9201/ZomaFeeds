const bcrypt = require('bcryptjs');
const otpModel = require('../models/otp.model');
const mailService = require('./mail.service');

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function generateOtp() {
    return String(Math.floor(1000 + Math.random() * 9000));
}

async function requestOtp({ email, role, purpose }) {
    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    await otpModel.findOneAndUpdate(
        { email, role, purpose },
        { otpHash, expiresAt, attempts: 0 },
        { upsert: true, setDefaultsOnInsert: true }
    );

    await mailService.sendOtpEmail(email, otp, purpose);
}

async function verifyOtp({ email, role, purpose, otp }) {
    const record = await otpModel.findOne({ email, role, purpose });
    if (!record) return false;

    if (record.expiresAt < new Date() || record.attempts >= MAX_ATTEMPTS) {
        await otpModel.deleteOne({ _id: record._id });
        return false;
    }

    const isMatch = await bcrypt.compare(String(otp || ''), record.otpHash);
    if (!isMatch) {
        await otpModel.updateOne({ _id: record._id }, { $inc: { attempts: 1 } });
        return false;
    }

    await otpModel.deleteOne({ _id: record._id });
    return true;
}

module.exports = { requestOtp, verifyOtp };

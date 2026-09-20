const userModel = require("../models/user.model")
const foodPartnerModel = require("../models/foodpartner.model")
const riderModel = require("../models/rider.model")
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const storageService = require('../services/storage.service');
const mailService = require('../services/mail.service');
const otpService = require('../services/otp.service');
const mapService = require('../services/map.service');
const { v4: uuid } = require('uuid');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

function setAuthCookie(res, id, role) {
    const token = jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });
}

async function requestOtp(req, res) {
    try {
        const { email, role, purpose } = req.body;

        if (!EMAIL_REGEX.test(email || '')) return res.status(400).json({ message: 'Please enter a valid email address' });
        if (!['user', 'foodPartner', 'rider'].includes(role)) return res.status(400).json({ message: 'Invalid role' });
        if (!['register', 'login'].includes(purpose)) return res.status(400).json({ message: 'Invalid purpose' });

        const Model = role === 'user' ? userModel : role === 'foodPartner' ? foodPartnerModel : riderModel;
        const existingAccount = await Model.findOne({ email });

        if (purpose === 'register' && existingAccount) return res.status(400).json({ message: 'An account with this email already exists' });
        if (purpose === 'login' && !existingAccount) return res.status(400).json({ message: 'No account found with this email' });

        try {
            await otpService.requestOtp({ email, role, purpose });
        } catch (mailError) {
            console.error('[requestOtp] sending OTP failed:', mailError);
            return res.status(502).json({ message: mailError.message || 'Could not send the OTP email right now. Please try again.' });
        }

        res.json({ message: 'A 4-digit code has been sent to your email' });
    } catch (error) {
        console.error('[requestOtp] failed:', error);
        res.status(500).json({ message: error.message || 'Could not process the OTP request right now' });
    }
}

async function registerUser(req, res) {
    try {
        const { fullName, email, password, otp } = req.body;

        if (!EMAIL_REGEX.test(email || '')) return res.status(400).json({ message: 'Please enter a valid email address' });
        if (!password && !otp) return res.status(400).json({ message: 'Provide a password or an OTP to register' });

        const isUserAlreadyExists = await userModel.findOne({
            email
        })

        if (isUserAlreadyExists) {
            return res.status(400).json({
                message: "User already exists"
            })
        }

        let hashedPassword;
        if (otp) {
            const isOtpValid = await otpService.verifyOtp({ email, role: 'user', purpose: 'register', otp });
            if (!isOtpValid) return res.status(400).json({ message: 'Invalid or expired OTP' });
        } else {
            hashedPassword = await bcrypt.hash(password, 10);
        }

        const profilePicture = req.file ? (await storageService.uploadFile(req.file.buffer, `profile-${uuid()}`)).url : undefined;
        const user = await userModel.create({
            fullName,
            email,
            password: hashedPassword,
            profilePicture
        })

        setAuthCookie(res, user._id, 'user');
        mailService.sendWelcomeEmail(email, fullName).catch(error => console.error('[mail] welcome email failed:', error.message));

        res.status(201).json({
            message: "User registered successfully",
            user: {
                _id: user._id,
                email: user.email,
                fullName: user.fullName,
                profilePicture: user.profilePicture
            }
        })
    } catch (error) {
        console.error('[registerUser] failed:', error);
        res.status(500).json({ message: error.message || 'Could not register right now' });
    }
}

async function loginUser(req, res) {
    try {
        const { email, password, otp } = req.body;

        const user = await userModel.findOne({
            email
        })

        if (!user) {
            return res.status(400).json({
                message: "Invalid email or password"
            })
        }

        if (otp) {
            const isOtpValid = await otpService.verifyOtp({ email, role: 'user', purpose: 'login', otp });
            if (!isOtpValid) return res.status(400).json({ message: 'Invalid or expired OTP' });
        } else {
            if (!user.password) return res.status(400).json({ message: 'This account has no password set. Log in with an OTP instead.' });
            const isPasswordValid = await bcrypt.compare(password || '', user.password);
            if (!isPasswordValid) return res.status(400).json({ message: "Invalid email or password" });
        }

        setAuthCookie(res, user._id, 'user');

        res.status(200).json({
            message: "User logged in successfully",
            user: {
                _id: user._id,
                email: user.email,
                fullName: user.fullName,
                profilePicture: user.profilePicture
            }
        })
    } catch (error) {
        console.error('[loginUser] failed:', error);
        res.status(500).json({ message: error.message || 'Could not log in right now' });
    }
}

function logoutUser(req, res) {
    res.clearCookie("token");
    res.status(200).json({
        message: "User logged out successfully"
    });
}


async function registerFoodPartner(req, res) {
    try {
        const { name, email, password, otp, phone, address, contactName, restaurantType } = req.body;

        if (!EMAIL_REGEX.test(email || '')) return res.status(400).json({ message: 'Please enter a valid email address' });
        if (!password && !otp) return res.status(400).json({ message: 'Provide a password or an OTP to register' });

        const isAccountAlreadyExists = await foodPartnerModel.findOne({
            email
        })

        if (isAccountAlreadyExists) {
            return res.status(400).json({
                message: "Food partner account already exists"
            })
        }

        let hashedPassword;
        if (otp) {
            const isOtpValid = await otpService.verifyOtp({ email, role: 'foodPartner', purpose: 'register', otp });
            if (!isOtpValid) return res.status(400).json({ message: 'Invalid or expired OTP' });
        } else {
            hashedPassword = await bcrypt.hash(password, 10);
        }

        const profilePicture = req.file ? (await storageService.uploadFile(req.file.buffer, `profile-${uuid()}`)).url : undefined;
        const geocoded = await mapService.geocodeWithFallback(address);
        const foodPartner = await foodPartnerModel.create({
            name,
            email,
            password: hashedPassword,
            phone,
            address,
            contactName,
            profilePicture,
            restaurantType,
            location: geocoded ? { type: 'Point', coordinates: [geocoded.lng, geocoded.lat] } : undefined
        })

        setAuthCookie(res, foodPartner._id, 'foodPartner');
        mailService.sendWelcomeEmail(email, name).catch(error => console.error('[mail] welcome email failed:', error.message));

        res.status(201).json({
            message: "Food partner registered successfully",
            foodPartner: {
                _id: foodPartner._id,
                email: foodPartner.email,
                name: foodPartner.name,
                address: foodPartner.address,
                contactName: foodPartner.contactName,
                phone: foodPartner.phone,
                profilePicture: foodPartner.profilePicture
                , restaurantType: foodPartner.restaurantType
            }
        })
    } catch (error) {
        console.error('[registerFoodPartner] failed:', error);
        res.status(500).json({ message: error.message || 'Could not register right now' });
    }
}

async function loginFoodPartner(req, res) {
    try {
        const { email, password, otp } = req.body;

        const foodPartner = await foodPartnerModel.findOne({
            email
        })

        if (!foodPartner) {
            return res.status(400).json({
                message: "Invalid email or password"
            })
        }

        if (otp) {
            const isOtpValid = await otpService.verifyOtp({ email, role: 'foodPartner', purpose: 'login', otp });
            if (!isOtpValid) return res.status(400).json({ message: 'Invalid or expired OTP' });
        } else {
            if (!foodPartner.password) return res.status(400).json({ message: 'This account has no password set. Log in with an OTP instead.' });
            const isPasswordValid = await bcrypt.compare(password || '', foodPartner.password);
            if (!isPasswordValid) return res.status(400).json({ message: "Invalid email or password" });
        }

        setAuthCookie(res, foodPartner._id, 'foodPartner');

        res.status(200).json({
            message: "Food partner logged in successfully",
            foodPartner: {
                _id: foodPartner._id,
                email: foodPartner.email,
                name: foodPartner.name,
                profilePicture: foodPartner.profilePicture
                , restaurantType: foodPartner.restaurantType
            }
        })
    } catch (error) {
        console.error('[loginFoodPartner] failed:', error);
        res.status(500).json({ message: error.message || 'Could not log in right now' });
    }
}

function logoutFoodPartner(req, res) {
    res.clearCookie("token");
    res.status(200).json({
        message: "Food partner logged out successfully"
    });
}

async function getCurrentSession(req, res) {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: 'Not authenticated' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const Model = decoded.role === 'user' ? userModel : decoded.role === 'foodPartner' ? foodPartnerModel : riderModel;
        const account = await Model.findById(decoded.id).select('-password');
        if (!account) return res.status(401).json({ message: 'Account not found' });
        return res.json({ role: decoded.role, account });
    } catch {
        return res.status(401).json({ message: 'Invalid session' });
    }
}

module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    registerFoodPartner,
    loginFoodPartner,
    logoutFoodPartner,
    getCurrentSession,
    getUserProfile,
    updateUserProfile,
    requestOtp
}

async function getUserProfile(req, res) {
    const user = await userModel.findById(req.user._id).select('-password');
    res.json({ user });
}

async function updateUserProfile(req, res) {
    const { fullName, email, phone } = req.body;
    const user = await userModel.findById(req.user._id);

    if (email && email !== user.email) {
        if (!EMAIL_REGEX.test(email)) return res.status(400).json({ message: 'Please enter a valid email address' });
        const emailTaken = await userModel.findOne({ email, _id: { $ne: user._id } });
        if (emailTaken) return res.status(400).json({ message: 'Email already in use' });
        user.email = email;
    }
    if (fullName?.trim()) user.fullName = fullName.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (req.file) user.profilePicture = (await storageService.uploadFile(req.file.buffer, `profile-${uuid()}`)).url;

    await user.save();
    res.json({ user: { _id: user._id, email: user.email, fullName: user.fullName, phone: user.phone, profilePicture: user.profilePicture } });
}

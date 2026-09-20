const foodPartnerModel = require("../models/foodpartner.model")
const userModel = require("../models/user.model")
const riderModel = require("../models/rider.model")
const jwt = require("jsonwebtoken");


async function authFoodPartnerMiddleware(req, res, next) {

    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({
            message: "Please login first"
        })
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        if (decoded.role !== 'foodPartner') {
            return res.status(403).json({ message: 'Food partner access required' })
        }

        const foodPartner = await foodPartnerModel.findById(decoded.id);

        if (!foodPartner) return res.status(401).json({ message: 'Food partner account not found' })

        req.foodPartner = foodPartner

        next()

    } catch (err) {

        return res.status(401).json({
            message: "Invalid token"
        })

    }

}

async function authUserMiddleware(req, res, next) {

    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({
            message: "Please login first"
        })
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        if (decoded.role !== 'user') {
            return res.status(403).json({ message: 'User access required' })
        }

        const user = await userModel.findById(decoded.id);

        if (!user) return res.status(401).json({ message: 'User account not found' })

        req.user = user

        next()

    } catch (err) {

        return res.status(401).json({
            message: "Invalid token"
        })

    }

}

async function authRiderMiddleware(req, res, next) {

    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({
            message: "Please login first"
        })
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        if (decoded.role !== 'rider') {
            return res.status(403).json({ message: 'Rider access required' })
        }

        const rider = await riderModel.findById(decoded.id);

        if (!rider) return res.status(401).json({ message: 'Rider account not found' })

        req.rider = rider

        next()

    } catch (err) {

        return res.status(401).json({
            message: "Invalid token"
        })

    }

}

async function authAnyMiddleware(req, res, next) {

    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({
            message: "Please login first"
        })
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        if (decoded.role === 'user') {
            const user = await userModel.findById(decoded.id);
            if (!user) return res.status(401).json({ message: 'User account not found' })
            req.user = user
        } else if (decoded.role === 'foodPartner') {
            const foodPartner = await foodPartnerModel.findById(decoded.id);
            if (!foodPartner) return res.status(401).json({ message: 'Food partner account not found' })
            req.foodPartner = foodPartner
        } else if (decoded.role === 'rider') {
            const rider = await riderModel.findById(decoded.id);
            if (!rider) return res.status(401).json({ message: 'Rider account not found' })
            req.rider = rider
        } else {
            return res.status(403).json({ message: 'Access denied' })
        }

        next()

    } catch (err) {

        return res.status(401).json({
            message: "Invalid token"
        })

    }

}

module.exports = {
    authFoodPartnerMiddleware,
    authUserMiddleware,
    authRiderMiddleware,
    authAnyMiddleware
}
const mongoose = require('mongoose');

const foodPartnerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    contactName: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String
    },
    profilePicture: {
        type: String
    },
    restaurantType: {
        type: String,
        enum: ['Veg', 'Non-Veg', 'Both'],
        required: true
    },
    isOpen: {
        type: Boolean,
        default: true
    },
    openingTime: {
        type: String,
        default: '09:00'
    },
    closingTime: {
        type: String,
        default: '22:00'
    },
    location: {
        type: { type: String, enum: ['Point'] },
        coordinates: { type: [Number] }
    },
    serviceRadiusKm: {
        type: Number,
        default: 5
    },
    packagingCharge: {
        type: Number,
        default: 0
    }
})

foodPartnerSchema.index({ location: '2dsphere' });

const foodPartnerModel = mongoose.model("foodpartner", foodPartnerSchema);

module.exports = foodPartnerModel;
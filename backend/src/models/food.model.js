const mongoose = require('mongoose');

const foodSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    video: {
        type: String,
        required: true,
    },
    // ImageKit's file id for `video` — kept so the cloud file can be deleted the moment this
    // food item is removed, instead of leaving orphaned storage behind.
    videoFileId: {
        type: String,
    },
    mediaType: {
        type: String,
        enum: ['video', 'image'],
        default: 'video'
    },
    description: {
        type: String,
    },
    category: {
        type: String,
        enum: ['Starters', 'Main Course - Veg', 'Main Course - Non Veg', 'Breads / Indian Breads', 'Rice & Biryani', 'Fast Food / Quick Bites', 'Soups & Salads', 'Desserts / Sweets (Meetha)', 'Beverages / Drinks'],
        required: true
    },
    foodPartner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "foodpartner",
        required: true
    },
    price: {
        type: Number,
        default: 1,
        min: 0
    },
    isAvailable: {
        type: Boolean,
        default: true
    },
    song: {
        type: {
            id: String,
            title: String,
            artist: String,
            image: String,
            url: String,
            startTime: { type: Number, default: 0, min: 0 },
            clipDuration: { type: Number, default: 30, min: 5, max: 30 }
        },
        default: undefined
    },
    likeCount: {
        type: Number,
        default: 0
    },
    savesCount: {
        type: Number,
        default: 0
    }
})


const foodModel = mongoose.model("food", foodSchema);


module.exports = foodModel;
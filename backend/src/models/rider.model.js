const mongoose = require('mongoose');

const riderSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    vehicleNumber: {
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
    // ImageKit's file id for `profilePicture` — kept so the old picture can be deleted from
    // cloud storage the moment it's replaced by a new one.
    profilePictureFileId: {
        type: String
    },
    isOnline: {
        type: Boolean,
        default: false
    },
    currentLocation: {
        lat: { type: Number },
        lng: { type: Number },
        updatedAt: { type: Date }
    }
})

const riderModel = mongoose.model("rider", riderSchema);

module.exports = riderModel;

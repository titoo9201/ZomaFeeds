const mongoose = require('mongoose');


const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
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
    phone: {
        type: String,
        trim: true
    },
    location: {
        type: { type: String, enum: ['Point'] },
        coordinates: { type: [Number] }
    },
    savedAddresses: [{
        label: { type: String, enum: ['Home', 'Girlfriend', 'Boyfriend', 'Friend', 'Relative', 'Other'], default: 'Home' },
        customLabel: { type: String, trim: true },
        houseNo: { type: String, trim: true },
        street: { type: String, trim: true },
        city: { type: String, trim: true },
        state: { type: String, trim: true },
        pincode: { type: String, trim: true },
        address: { type: String, trim: true, required: true },
        // Set only when the user drags the confirm-location pin — lets order-time delivery
        // pricing skip re-geocoding this address and use the exact confirmed spot instead.
        lat: { type: Number },
        lng: { type: Number }
    }]
},
    {
        timestamps: true
    }
)

userSchema.index({ location: '2dsphere' });

const userModel = mongoose.model("user", userSchema);

module.exports = userModel;
const userModel = require('../models/user.model');
const mapService = require('../services/map.service');

async function updateUserLocation(req, res) {
    try {
        const { lat, lng, address } = req.body;

        let coordinates;
        if (typeof lat === 'number' && typeof lng === 'number') {
            coordinates = [lng, lat];
        } else if (address?.trim()) {
            const geocoded = await mapService.geocodeWithFallback(address.trim());
            if (!geocoded) return res.status(400).json({ message: 'Could not find that address. Please try a more specific one.' });
            coordinates = [geocoded.lng, geocoded.lat];
        } else {
            return res.status(400).json({ message: 'Provide either your coordinates or an address' });
        }

        const user = await userModel.findByIdAndUpdate(
            req.user._id,
            { location: { type: 'Point', coordinates } },
            { new: true }
        ).select('-password');

        res.json({ user });
    } catch (error) {
        console.error('[updateUserLocation] failed:', error);
        res.status(500).json({ message: error.message || 'Could not update your location' });
    }
}

const ADDRESS_LABELS = ['Home', 'Girlfriend', 'Boyfriend', 'Friend', 'Relative', 'Other'];

async function getSavedAddresses(req, res) {
    const user = await userModel.findById(req.user._id).select('savedAddresses');
    res.json({ addresses: user.savedAddresses });
}

async function addSavedAddress(req, res) {
    try {
        const { label, customLabel, houseNo, street, city, state, pincode } = req.body;
        if (!houseNo?.trim() || !street?.trim() || !city?.trim() || !state?.trim() || !pincode?.trim()) return res.status(400).json({ message: 'Full address is required' });
        const resolvedLabel = ADDRESS_LABELS.includes(label) ? label : 'Home';
        const address = [houseNo, street, city, state, pincode].map(part => part?.trim()).filter(Boolean).join(', ');

        const user = await userModel.findById(req.user._id);
        user.savedAddresses.push({
            label: resolvedLabel,
            customLabel: resolvedLabel === 'Other' ? customLabel?.trim() : undefined,
            houseNo: houseNo.trim(), street: street.trim(), city: city.trim(), state: state.trim(), pincode: pincode.trim(),
            address
        });
        await user.save();
        res.status(201).json({ addresses: user.savedAddresses });
    } catch (error) {
        console.error('[addSavedAddress] failed:', error);
        res.status(500).json({ message: error.message || 'Could not save this address' });
    }
}

async function deleteSavedAddress(req, res) {
    try {
        const user = await userModel.findById(req.user._id);
        user.savedAddresses = user.savedAddresses.filter(item => String(item._id) !== req.params.id);
        await user.save();
        res.json({ addresses: user.savedAddresses });
    } catch (error) {
        console.error('[deleteSavedAddress] failed:', error);
        res.status(500).json({ message: error.message || 'Could not remove this address' });
    }
}

module.exports = { updateUserLocation, getSavedAddresses, addSavedAddress, deleteSavedAddress };

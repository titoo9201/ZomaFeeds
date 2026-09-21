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


function resolveDisplayAddress(address, lat, lng) {
    if (address?.trim()) return address.trim();
    return `Pinned location (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
}

async function addSavedAddress(req, res) {
    try {
        const { label, customLabel, address: addressText, lat, lng } = req.body;
        if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return res.status(400).json({ message: 'A location is required — use GPS or paste a Google Maps link' });
        const resolvedLabel = ADDRESS_LABELS.includes(label) ? label : 'Home';
        const address = resolveDisplayAddress(addressText, Number(lat), Number(lng));

        const user = await userModel.findById(req.user._id);
        user.savedAddresses.push({
            label: resolvedLabel,
            customLabel: resolvedLabel === 'Other' ? customLabel?.trim() : undefined,
            address,
            lat: Number(lat),
            lng: Number(lng)
        });
        await user.save();
        res.status(201).json({ addresses: user.savedAddresses });
    } catch (error) {
        console.error('[addSavedAddress] failed:', error);
        res.status(500).json({ message: error.message || 'Could not save this address' });
    }
}

async function updateSavedAddress(req, res) {
    try {
        const { label, customLabel, address: addressText, lat, lng } = req.body;
        if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return res.status(400).json({ message: 'A location is required — use GPS or paste a Google Maps link' });
        const resolvedLabel = ADDRESS_LABELS.includes(label) ? label : 'Home';
        const address = resolveDisplayAddress(addressText, Number(lat), Number(lng));

        const user = await userModel.findById(req.user._id);
        const saved = user.savedAddresses.id(req.params.id);
        if (!saved) return res.status(404).json({ message: 'Address not found' });

        saved.label = resolvedLabel;
        saved.customLabel = resolvedLabel === 'Other' ? customLabel?.trim() : undefined;
        saved.address = address;
        saved.lat = Number(lat);
        saved.lng = Number(lng);

        await user.save();
        res.json({ addresses: user.savedAddresses });
    } catch (error) {
        console.error('[updateSavedAddress] failed:', error);
        res.status(500).json({ message: error.message || 'Could not update this address' });
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

module.exports = { updateUserLocation, getSavedAddresses, addSavedAddress, updateSavedAddress, deleteSavedAddress };

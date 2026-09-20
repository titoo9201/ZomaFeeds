const mapService = require('../services/map.service');

async function reverseGeocode(req, res) {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return res.status(400).json({ message: 'lat and lng are required' });
    const address = await mapService.reverseGeocode(lat, lng);
    if (!address) return res.status(502).json({ message: 'Could not detect your address right now. Please fill it in manually.' });
    res.json({ address });
}

module.exports = { reverseGeocode };

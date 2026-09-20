const mapService = require('../services/map.service');

async function reverseGeocode(req, res) {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return res.status(400).json({ message: 'lat and lng are required' });
    const address = await mapService.reverseGeocode(lat, lng);
    if (!address) return res.status(502).json({ message: 'Could not detect your address right now. Please fill it in manually.' });
    res.json({ address });
}

// Address entry is now GPS-or-Maps-link only (no free text to geocode), so the only way to turn
// a pasted link into a point is parsing the URL itself — never a text geocode call.
async function parseMapsLink(req, res) {
    const url = req.body.url;
    if (!url?.trim()) return res.status(400).json({ message: 'A Google Maps link is required' });
    const location = await mapService.parseMapsLink(url);
    if (!location) return res.status(400).json({ message: "Could not read a location from that link. Make sure it's a Google Maps link with a pinned point, or use GPS instead." });
    res.json({ location });
}

module.exports = { reverseGeocode, parseMapsLink };

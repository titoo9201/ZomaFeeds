const axios = require('axios');
const foodPartnerModel = require('../models/foodpartner.model');
const { MAX_DELIVERY_RANGE_KM } = require('../config/pricingConfig');

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';

async function geocode(address) {
    if (!address?.trim()) return null;
    try {
        const { data } = await axios.get(NOMINATIM_URL, {
            params: { q: address, format: 'json', limit: 1 },
            headers: { 'User-Agent': 'ZomaFeeds/1.0' },
            timeout: 8000
        });
        if (!data?.length) return null;
        return { lat: Number(data[0].lat), lng: Number(data[0].lon) };
    } catch (error) {
        console.error('[map.service] geocode failed:', error.message);
        return null;
    }
}

// Nominatim often fails on hyper-specific addresses (house no / apartment / society names it
// doesn't index) but succeeds on the coarser city/state/pincode portion. Retry progressively
// dropping the leading (most specific) comma-separated segments before giving up entirely.
async function geocodeWithFallback(address) {
    if (!address?.trim()) return null;
    const parts = address.split(',').map(part => part.trim()).filter(Boolean);
    for (let i = 0; i < parts.length; i++) {
        const query = parts.slice(i).join(', ');
        const result = await geocode(query);
        if (result) return result;
    }
    return null;
}

async function getRoute(from, to) {
    if (!from?.lat || !to?.lat) return null;
    try {
        const { data } = await axios.get(`${OSRM_URL}/${from.lng},${from.lat};${to.lng},${to.lat}`, {
            params: { overview: 'full', geometries: 'geojson' },
            timeout: 8000
        });
        const route = data?.routes?.[0];
        if (!route) return null;
        return {
            distance: route.distance,
            duration: route.duration,
            geometry: route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }))
        };
    } catch (error) {
        console.error('[map.service] getRoute failed:', error.message);
        return null;
    }
}

// Returns a Map<foodPartnerId, distanceKm> of partners within the flat platform-wide
// MAX_DELIVERY_RANGE_KM of the given coordinates, or null when no coordinates are given
// (meaning: no radius filtering). This same flat 15km cap is the only delivery-range rule
// used both for feed/discovery and for actual order acceptance — no per-restaurant override.
async function getPartnersWithinServiceRadius(coordinates) {
    if (!coordinates || coordinates.length !== 2) return null;
    try {
        const results = await foodPartnerModel.aggregate([
            {
                $geoNear: {
                    near: { type: 'Point', coordinates },
                    distanceField: 'distanceMeters',
                    spherical: true,
                    maxDistance: MAX_DELIVERY_RANGE_KM * 1000
                }
            },
            { $project: { distanceMeters: 1 } }
        ]);
        return new Map(results.map(item => [String(item._id), Number((item.distanceMeters / 1000).toFixed(2))]));
    } catch (error) {
        console.error('[map.service] getPartnersWithinServiceRadius failed:', error.message);
        return null;
    }
}

async function reverseGeocode(lat, lng) {
    try {
        const { data } = await axios.get('https://nominatim.openstreetmap.org/reverse', {
            params: { lat, lon: lng, format: 'json', addressdetails: 1 },
            headers: { 'User-Agent': 'ZomaFeeds/1.0' },
            timeout: 8000
        });
        const a = data?.address;
        if (!a) return null;
        return {
            houseNo: a.house_number || '',
            street: a.road || a.neighbourhood || a.suburb || '',
            city: a.city || a.town || a.village || a.county || '',
            state: a.state || '',
            pincode: a.postcode || ''
        };
    } catch (error) {
        console.error('[map.service] reverseGeocode failed:', error.message);
        return null;
    }
}

const ARRIVAL_THRESHOLD_METERS = 200;

function distanceMeters(a, b) {
    if (!a?.lat || !b?.lat) return Infinity;
    const R = 6371000;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;
    const lat1 = a.lat * Math.PI / 180;
    const lat2 = b.lat * Math.PI / 180;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}

module.exports = { geocode, geocodeWithFallback, reverseGeocode, getRoute, getPartnersWithinServiceRadius, distanceMeters, ARRIVAL_THRESHOLD_METERS };

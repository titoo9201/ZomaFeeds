const axios = require('axios');
const foodPartnerModel = require('../models/foodpartner.model');
const { MAX_DELIVERY_RANGE_KM } = require('../config/pricingConfig');

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';

// Only used by updateUserLocation's legacy text-address fallback now — the GPS/Maps-link flow
// (registration, saved addresses, order creation) never calls this.
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

// Turns a reverseGeocode() result into a short human-readable label for display only
// (never used for distance/range logic — that always works off stored lat/lng directly).
function formatDisplayAddress(reverseGeocoded) {
    if (!reverseGeocoded) return null;
    const { street, city, state } = reverseGeocoded;
    const label = [street, city, state].map(part => part?.trim()).filter(Boolean).join(', ');
    return label || null;
}

// Generous bounding box covering all Indian territory (including Andaman & Nicobar, J&K,
// Arunachal Pradesh) — used to sanity-check coordinates pulled from a pasted Maps link.
function isWithinIndia(lat, lng) {
    return lat >= 6 && lat <= 38 && lng >= 68 && lng <= 98;
}

// Google Maps URLs encode a pinned point in several different ways depending on how the link
// was generated/shared. Tried in priority order (most precise/explicit first).
const MAPS_URL_COORD_PATTERNS = [
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,          // Place-card URLs: .../data=!3m1!4b1!4m4!3m3!8m2!3d<lat>!4d<lng>
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,               // Map-view URLs: .../@<lat>,<lng>,17z
    /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,          // Simple share links: ?q=<lat>,<lng>
    /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/,         // Legacy links: ?ll=<lat>,<lng>
    /\/search\/(-?\d+\.\d+),\+?\s*(-?\d+\.\d+)/, // "Dropped pin" search URLs: .../maps/search/<lat>,+<lng>
    /(-?\d{1,3}\.\d+),\+?\s*(-?\d{1,3}\.\d+)/   // Last-resort: first comma-separated float pair anywhere
];

function extractLatLngFromUrl(urlString) {
    for (const pattern of MAPS_URL_COORD_PATTERNS) {
        const match = urlString.match(pattern);
        if (match) {
            const lat = Number(match[1]);
            const lng = Number(match[2]);
            if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
        }
    }
    return null;
}

// A link shared from a Google Maps *place card* (a named business/POI, as opposed to a
// "dropped pin") encodes location as a place name + an opaque CID feature ID
// (.../data=!4m2!3m1!1s0x...:0x...!...) — there's no lat/lng anywhere in that URL at all, and
// resolving a CID to coordinates needs a paid Google Places API call. But the readable address
// is right there in the URL path (.../maps/place/<address, +-separated>/data=...), so we
// extract and geocode that as a best-effort starting point — PinConfirmMap lets the user drag
// to the exact spot regardless, so an approximate geocode here is fine.
function extractPlaceAddressFromUrl(urlString) {
    const match = urlString.match(/\/maps\/place\/([^/?]+)/);
    if (!match) return null;
    try {
        return decodeURIComponent(match[1].replace(/\+/g, ' '));
    } catch {
        return match[1].replace(/\+/g, ' ');
    }
}

// Short links (maps.app.goo.gl/..., goo.gl/maps/...) carry no coordinates in the URL itself —
// they redirect to the real long-form URL, so we follow the redirect chain server-side first.
async function parseMapsLink(rawUrl) {
    let url;
    try { url = new URL(rawUrl.trim()); } catch { return null; }
    if (!/(^|\.)google\.[a-z.]+$|(^|\.)goo\.gl$/.test(url.hostname)) return null;

    const direct = extractLatLngFromUrl(url.href);
    if (direct) return isWithinIndia(direct.lat, direct.lng) ? direct : null;

    // No coordinates in the short link itself — resolve it to its final long-form URL.
    try {
        const response = await axios.get(url.href, {
            maxRedirects: 10,
            timeout: 8000,
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ZomaFeeds/1.0)' },
            validateStatus: status => status < 400
        });
        const resolvedUrl = response.request?.res?.responseUrl || url.href;

        let resolved = extractLatLngFromUrl(resolvedUrl) || extractLatLngFromUrl(String(response.data).slice(0, 20000));
        if (!resolved) {
            // No coordinates anywhere — this is likely a "place" link (named business/POI)
            // whose only location info is a readable address in the URL path. Geocode that.
            const placeAddress = extractPlaceAddressFromUrl(resolvedUrl);
            if (placeAddress) resolved = await geocodeWithFallback(placeAddress);
        }
        if (!resolved) return null;
        return isWithinIndia(resolved.lat, resolved.lng) ? resolved : null;
    } catch (error) {
        console.error('[map.service] parseMapsLink failed to resolve short link:', error.message);
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

module.exports = {
    geocode, geocodeWithFallback, reverseGeocode, getRoute, getPartnersWithinServiceRadius, distanceMeters,
    ARRIVAL_THRESHOLD_METERS, formatDisplayAddress, isWithinIndia, parseMapsLink
};

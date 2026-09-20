const { RESTAURANT_GST_RATE, SERVICE_GST_RATE, PLATFORM_FEE } = require('../config/pricingConfig');

const MAX_DELIVERY_RANGE_KM = 15;

// Slabs are checked in order; the first one whose maxKm covers the distance wins.
const DELIVERY_SLABS = [
    { maxKm: 3, fee: 20 },
    { maxKm: 7, fee: 30 },
    { maxKm: 15, fee: 40 }
];

// Returns the delivery fee in rupees, or null when the address is out of deliverable range
// (beyond 15km, or beyond the restaurant's own serviceRadiusKm — whichever is smaller).
function calculateDeliveryFee(distanceKm, serviceRadiusKm) {
    if (distanceKm == null || !Number.isFinite(distanceKm)) return null;
    const maxRange = Math.min(MAX_DELIVERY_RANGE_KM, serviceRadiusKm ?? MAX_DELIVERY_RANGE_KM);
    if (distanceKm > maxRange) return null;
    const slab = DELIVERY_SLABS.find(item => distanceKm <= item.maxKm);
    return slab ? slab.fee : null;
}

// Zomato-style bill: item-side GST on the food itself, plus a separate GST on the
// delivery/platform service fees — mirrors how these are actually taxed differently.
function computeBill(itemsTotal, deliveryFee, packagingCharge = 0) {
    const restaurantGST = Number((itemsTotal * RESTAURANT_GST_RATE).toFixed(2));
    const platformFee = PLATFORM_FEE;
    const serviceGST = Number(((deliveryFee + platformFee) * SERVICE_GST_RATE).toFixed(2));
    const grandTotal = Number((itemsTotal + restaurantGST + packagingCharge + deliveryFee + platformFee + serviceGST).toFixed(2));
    return { itemsTotal, restaurantGST, packagingCharge, deliveryFee, platformFee, serviceGST, grandTotal };
}

module.exports = { calculateDeliveryFee, computeBill, MAX_DELIVERY_RANGE_KM };

const { RESTAURANT_GST_RATE, SERVICE_GST_RATE, PLATFORM_FEE, MAX_DELIVERY_RANGE_KM } = require('../config/pricingConfig');

// Slabs are checked in order; the first one whose maxKm covers the distance wins.
const DELIVERY_SLABS = [
    { maxKm: 3, fee: 20 },
    { maxKm: 7, fee: 30 },
    { maxKm: 15, fee: 40 }
];

// Returns the delivery fee in rupees, or null when the address is beyond the flat
// platform-wide MAX_DELIVERY_RANGE_KM (15km) — the only delivery-range rule, for every restaurant.
function calculateDeliveryFee(distanceKm) {
    if (distanceKm == null || !Number.isFinite(distanceKm)) return null;
    if (distanceKm > MAX_DELIVERY_RANGE_KM) return null;
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
    return { itemsTotal, restaurantGST, packagingCharge, deliveryFee, platformFee, serviceGST, grandTotal, roundOff: 0 };
}

// Cash on delivery is settled in physical currency, so the payable amount has to be a whole
// rupee — paise can't practically change hands. Rounds only the final grand total (the actual
// line items — GST, fees — stay precise for accounting) and records the adjustment as its own
// "round off" entry, the same convention Zomato/Swiggy use, instead of silently absorbing it.
// UPI/Card payments are untouched and keep the precise decimal total.
function applyCodRounding(bill) {
    const roundedTotal = Math.round(bill.grandTotal);
    const roundOff = Number((roundedTotal - bill.grandTotal).toFixed(2));
    return { ...bill, grandTotal: roundedTotal, roundOff };
}

module.exports = { calculateDeliveryFee, computeBill, applyCodRounding, MAX_DELIVERY_RANGE_KM };

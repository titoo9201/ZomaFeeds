const { RESTAURANT_GST_RATE, SERVICE_GST_RATE, PLATFORM_FEE, STANDARD_DELIVERY_RANGE_KM, MAX_DELIVERY_RANGE_KM, PREMIUM_BASE_FEE, PREMIUM_PER_KM_CHARGE } = require('../config/pricingConfig');

// Slabs are checked in order; the first one whose maxKm covers the distance wins.
const DELIVERY_SLABS = [
    { maxKm: 3, fee: 20 },
    { maxKm: 7, fee: 30 },
    { maxKm: 15, fee: 40 }
];

// Beyond STANDARD_DELIVERY_RANGE_KM (15km), up to MAX_DELIVERY_RANGE_KM (30km), a restaurant
// is still orderable but at a distance-scaled premium fee (Zomato/Swiggy-style) instead of the
// normal slabs above: a base fee plus a per-km charge for every km beyond 15. Extra km is
// rounded UP (15.2km counts as 1 extra km) so any distance past the boundary is charged for.
function calculatePremiumDeliveryFee(distanceKm) {
    const extraKm = Math.ceil(distanceKm - STANDARD_DELIVERY_RANGE_KM);
    return PREMIUM_BASE_FEE + extraKm * PREMIUM_PER_KM_CHARGE;
}

// Returns the delivery fee in rupees, or null when the address is beyond the flat
// platform-wide MAX_DELIVERY_RANGE_KM (30km) — nothing beyond that is ever orderable.
function calculateDeliveryFee(distanceKm) {
    if (distanceKm == null || !Number.isFinite(distanceKm)) return null;
    if (distanceKm > MAX_DELIVERY_RANGE_KM) return null;
    if (distanceKm > STANDARD_DELIVERY_RANGE_KM) return calculatePremiumDeliveryFee(distanceKm);
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

module.exports = { calculateDeliveryFee, computeBill, applyCodRounding, STANDARD_DELIVERY_RANGE_KM, MAX_DELIVERY_RANGE_KM };

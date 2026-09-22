export const PLATFORM_FEE = 6
export const RESTAURANT_GST_RATE = 0.05
export const SERVICE_GST_RATE = 0.18
// Mirrors backend/src/config/pricingConfig.js — up to this distance, delivery is at the normal
// rate; beyond it (up to the 30km discovery limit) a restaurant is still orderable but at a
// higher delivery fee, shown as a note on its reel/card.
export const STANDARD_DELIVERY_RANGE_KM = 15

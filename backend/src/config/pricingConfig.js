module.exports = {
    RESTAURANT_GST_RATE: 0.05,
    SERVICE_GST_RATE: 0.18,
    PLATFORM_FEE: 6,
    // Used when an address genuinely can't be geocoded (even after the fallback chain) — a
    // standard delivery fee so the order still goes through instead of being rejected.
    DEFAULT_DELIVERY_FEE: 30,
    // Up to this distance, delivery uses the normal fee slabs (see pricing.service.js).
    STANDARD_DELIVERY_RANGE_KM: 15,
    // Beyond STANDARD_DELIVERY_RANGE_KM and up to this distance, a restaurant is still shown
    // in the feed and orderable, just at a premium delivery fee — reflects the extra distance
    // and nudges towards a closer restaurant when one's available. Nothing beyond this shows
    // up at all, in either the feed or order acceptance. No per-restaurant override.
    MAX_DELIVERY_RANGE_KM: 30,
    // Premium-band (15km-30km) delivery fee = PREMIUM_BASE_FEE + (extra km beyond 15 * PREMIUM_PER_KM_CHARGE).
    PREMIUM_BASE_FEE: 50,
    PREMIUM_PER_KM_CHARGE: 12,
};

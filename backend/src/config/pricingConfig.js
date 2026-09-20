module.exports = {
    RESTAURANT_GST_RATE: 0.05,
    SERVICE_GST_RATE: 0.18,
    PLATFORM_FEE: 6,
    // Used when an address genuinely can't be geocoded (even after the fallback chain) — a
    // standard delivery fee so the order still goes through instead of being rejected.
    DEFAULT_DELIVERY_FEE: 30,
    // The single, flat platform-wide cap on delivery distance — used identically for both
    // Home feed/discovery and actual order acceptance. No per-restaurant override.
    MAX_DELIVERY_RANGE_KM: 15,
};

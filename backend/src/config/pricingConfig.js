module.exports = {
    RESTAURANT_GST_RATE: 0.05,
    SERVICE_GST_RATE: 0.18,
    PLATFORM_FEE: 6,
    // Used when an address genuinely can't be geocoded (even after the fallback chain) — a
    // standard delivery fee so the order still goes through instead of being rejected.
    DEFAULT_DELIVERY_FEE: 30,
};

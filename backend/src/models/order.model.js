const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    food: { type: mongoose.Schema.Types.ObjectId, ref: "food", required: true },
    quantity: { type: Number, required: true, min: 1, max: 50 },
    address: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: [
        "pending",
        "preparing",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "refunded"],
      default: "unpaid",
    },
    paymentMethod: { type: String, enum: ["upi", "card", "cod"] },
    cancellationReason: { type: String, trim: true },
    total: { type: Number, default: 0, min: 0 },
    deliveryFee: { type: Number, default: 0 },
    distanceKm: { type: Number },
    pickupLocation: {
      lat: { type: Number },
      lng: { type: Number },
    },
    dropLocation: {
      lat: { type: Number },
      lng: { type: Number },
    },
    rider: { type: mongoose.Schema.Types.ObjectId, ref: "rider", default: null },
    riderStatus: {
      type: String,
      enum: ["unassigned", "assigned", "picked_up", "out_for_delivery", "delivered"],
      default: "unassigned",
    },
    billBreakdown: {
      itemsTotal: { type: Number, default: 0 },
      restaurantGST: { type: Number, default: 0 },
      packagingCharge: { type: Number, default: 0 },
      platformFee: { type: Number, default: 0 },
      serviceGST: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("order", orderSchema);

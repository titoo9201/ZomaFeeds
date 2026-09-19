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
  },
  { timestamps: true },
);

module.exports = mongoose.model("order", orderSchema);

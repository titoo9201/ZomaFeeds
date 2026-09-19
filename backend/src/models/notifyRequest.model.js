const mongoose = require("mongoose");

const notifyRequestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    foodPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "foodpartner",
      required: true,
    },
    fulfilled: { type: Boolean, default: false },
  },
  { timestamps: true },
);

notifyRequestSchema.index({ user: 1, foodPartner: 1 }, { unique: true });
module.exports = mongoose.model("notifyRequest", notifyRequestSchema);

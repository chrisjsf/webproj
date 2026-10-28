const mongoose = require("mongoose");

const claimSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    explanation: { type: String, required: true, trim: true, maxlength: 1000 },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" }
  },
  { timestamps: true }
);

claimSchema.index({ item: 1, student: 1 }, { unique: true });

module.exports = mongoose.model("Claim", claimSchema);

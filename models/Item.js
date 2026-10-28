const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    itemName: { type: String, required: true, trim: true, maxlength: 100 },
    category: { type: String, required: true, trim: true, maxlength: 50 },
    reportType: { type: String, enum: ["lost", "found"], required: true },
    description: { type: String, required: true, trim: true, maxlength: 1000 },
    location: { type: String, required: true, trim: true, maxlength: 120 },
    date: { type: Date, required: true },
    imageUrl: { type: String, trim: true, maxlength: 500, default: "" },
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["open", "claimed", "returned", "deleted"], default: "open" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Item", itemSchema);

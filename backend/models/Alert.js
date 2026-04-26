import mongoose from "mongoose";

const alertSchema = new mongoose.Schema(
  {
    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      required: true
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    severity: {
      type: String,
      enum: ["medium", "high", "critical"],
      default: "medium"
    },
    resolved: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export default mongoose.model("Alert", alertSchema);

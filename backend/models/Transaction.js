import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    customerName: { type: String, required: true, trim: true, minlength: 3 },
    amount: { type: Number, required: true, min: 0.01 },
    merchant: { type: String, required: true, trim: true, minlength: 2 },
    location: { type: String, required: true, trim: true, minlength: 2 },
    paymentMethod: {
      type: String,
      enum: ["card", "upi", "netbanking", "wallet"],
      default: "card"
    },
    status: {
      type: String,
      enum: ["approved", "review", "blocked"],
      default: "approved"
    },
    riskScore: { type: Number, default: 0 },
    riskLevel: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "low"
    },
    reasons: [{ type: String }],
    mlMeta: {
      confidence: { type: String, enum: ["low", "medium", "high"], default: "low" },
      confidenceScore: { type: Number, default: 0 },
      scoreBoost: { type: Number, default: 0 },
      features: { type: mongoose.Schema.Types.Mixed, default: {} }
    }
  },
  { timestamps: true }
);

export default mongoose.model("Transaction", transactionSchema);

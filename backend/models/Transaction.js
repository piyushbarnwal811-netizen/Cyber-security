import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true },
    amount: { type: Number, required: true },
    merchant: { type: String, required: true },
    location: { type: String, required: true },
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
    reasons: [{ type: String }]
  },
  { timestamps: true }
);

export default mongoose.model("Transaction", transactionSchema);

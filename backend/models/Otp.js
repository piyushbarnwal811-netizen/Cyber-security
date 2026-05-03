import mongoose from "mongoose";

const otpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, index: true },
    purpose: { type: String, enum: ["login", "register", "transaction"], required: true },
    code: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    challengeOptions: [{ type: String }],
    isVerified: { type: Boolean, default: false },
    verifiedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

export default mongoose.model("Otp", otpSchema);

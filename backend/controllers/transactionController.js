import Alert from "../models/Alert.js";
import Otp from "../models/Otp.js";
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";
import { faceSignatureDistance, isValidFaceSignature } from "../utils/faceSignature.js";
import { sendEmail } from "../utils/sendEmail.js";
import { calculateRisk } from "../utils/riskEngine.js";

const hasLetter = (value) => /[A-Za-z]/.test(String(value || ""));
const isRealName = (value) => /^[A-Za-z]+(?:\s+[A-Za-z]+)+$/.test(String(value || "").trim());
const FACE_MATCH_MAX_DISTANCE = Number(process.env.FACE_MATCH_MAX_DISTANCE || 14);
const normalizeOtp = (otp) => String(otp || "").trim().replace(/\s+/g, "");
const createOtpCode = () => String(Math.floor(100000 + Math.random() * 900000));

const validateTransactionPayload = (payload) => {
  const customerName = String(payload.customerName || "").trim();
  const merchant = String(payload.merchant || "").trim();
  const location = String(payload.location || "").trim();
  const amount = Number(payload.amount);

  if (customerName.length < 3 || !isRealName(customerName)) {
    return "Customer name must be a real name (first and last name, letters only)";
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return "Amount must be greater than 0";
  }
  if (merchant.length < 2 || !hasLetter(merchant)) {
    return "Merchant must be at least 2 characters and include letters";
  }
  if (location.length < 2 || !hasLetter(location)) {
    return "Location must be at least 2 characters and include letters";
  }

  return null;
};

export const createTransaction = async (req, res, next) => {
  try {
    const validationError = validateTransactionPayload(req.body);
    if (validationError) {
      res.status(400);
      throw new Error(validationError);
    }

    const risk = calculateRisk(req.body);
    const incomingFaceSignature = String(req.body.faceSignature || "");
    let finalStatus = risk.status;

    if (risk.level === "high" || risk.level === "medium") {
      const user = await User.findById(req.user._id).select("faceSignature");
      if (!user?.faceSignature && risk.level === "high") {
        res.status(403);
        throw new Error("Face enrollment missing. Please re-register your account.");
      }
      if (!isValidFaceSignature(incomingFaceSignature) && risk.level === "high") {
        res.status(403);
        throw new Error("Live face verification is required for high-risk payments");
      }

      const canCompareFace = user?.faceSignature && isValidFaceSignature(incomingFaceSignature);
      if (canCompareFace) {
        const distance = faceSignatureDistance(user.faceSignature, incomingFaceSignature);
        if (distance > FACE_MATCH_MAX_DISTANCE) {
          if (risk.level === "high") {
            res.status(403);
            throw new Error(
              `Face verification failed (distance: ${distance}). Please recapture face in better lighting and try again.`
            );
          }
        } else {
          const providedOtp = normalizeOtp(req.body.transactionOtp);
          const now = new Date();
          const existingOtp = await Otp.findOne({
            email: String(req.user.email || "").toLowerCase(),
            purpose: "transaction",
            expiresAt: { $gt: now }
          }).sort({ createdAt: -1 });

          if (!providedOtp) {
            const code = createOtpCode();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
            await Otp.deleteMany({
              email: String(req.user.email || "").toLowerCase(),
              purpose: "transaction"
            });
            await Otp.create({
              email: String(req.user.email || "").toLowerCase(),
              purpose: "transaction",
              code,
              expiresAt
            });
            await sendEmail({
              to: req.user.email,
              subject: `FraudShield ${risk.level}-risk transaction OTP`,
              text: `Your transaction OTP is ${code}. It expires in 10 minutes.`
            });
            return res.status(202).json({
              requiresOtp: true,
              message: "Face matched. OTP sent to your email. Enter OTP to complete payment."
            });
          }

          if (!existingOtp || existingOtp.code !== providedOtp) {
            res.status(401);
            throw new Error("Invalid or expired transaction OTP");
          }
          await Otp.deleteMany({
            email: String(req.user.email || "").toLowerCase(),
            purpose: "transaction"
          });

          finalStatus = "approved";
        }
      }
    }

    const { faceSignature, transactionOtp, ...transactionPayload } = req.body;
    const transaction = await Transaction.create({
      ...transactionPayload,
      user: req.user._id,
      riskScore: risk.score,
      riskLevel: risk.level,
      status: finalStatus,
      reasons: risk.reasons
    });

    if (risk.level !== "low") {
      await Alert.create({
        transaction: transaction._id,
        title: `${risk.level.toUpperCase()} risk transaction`,
        message: risk.reasons.join(", ") || "Transaction requires review",
        severity: risk.level === "high" ? "critical" : "medium"
      });

      await sendEmail({
        to: req.user.email,
        subject: `FraudShield Alert: ${risk.level.toUpperCase()} risk transaction`,
        text: `A ${risk.level} risk transaction was detected.\n\nAmount: ${transaction.amount}\nMerchant: ${transaction.merchant}\nLocation: ${transaction.location}\nReasons: ${
          risk.reasons.join(", ") || "Requires review"
        }`
      });
    }

    res.status(201).json(transaction);
  } catch (error) {
    next(error);
  }
};

export const getTransactions = async (req, res, next) => {
  try {
    const transactions = await Transaction.find({ user: req.user._id }).sort({
      createdAt: -1
    });
    res.json(transactions);
  } catch (error) {
    next(error);
  }
};

export const getTransactionById = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!transaction) {
      res.status(404);
      throw new Error("Transaction not found");
    }

    res.json(transaction);
  } catch (error) {
    next(error);
  }
};

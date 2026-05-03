import Alert from "../models/Alert.js";
import crypto from "crypto";
import Otp from "../models/Otp.js";
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";
import { faceSignatureDistance, isValidFaceSignature } from "../utils/faceSignature.js";
import { calculateMlRisk } from "../utils/mlRiskEngine.js";
import { sendEmail } from "../utils/sendEmail.js";
import { calculateRisk } from "../utils/riskEngine.js";

const hasLetter = (value) => /[A-Za-z]/.test(String(value || ""));
const isRealName = (value) => /^[A-Za-z]+(?:\s+[A-Za-z]+)+$/.test(String(value || "").trim());
const FACE_MATCH_MAX_DISTANCE = Number(process.env.FACE_MATCH_MAX_DISTANCE || 25);
const createMatchNumber = () => String(Math.floor(10 + Math.random() * 90));
const signChallenge = ({ challengeId, value, email }) =>
  crypto
    .createHmac("sha256", process.env.JWT_SECRET || "dev_secret")
    .update(`${challengeId}:${value}:${String(email || "").toLowerCase()}`)
    .digest("hex");

const buildThreeChoices = (correct) => {
  const set = new Set([correct]);
  while (set.size < 3) set.add(createMatchNumber());
  return [...set].sort(() => Math.random() - 0.5);
};
const toRiskBand = (score) => {
  if (score >= 75) return { level: "high", status: "blocked" };
  if (score >= 45) return { level: "medium", status: "review" };
  return { level: "low", status: "approved" };
};

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

    const baseRisk = calculateRisk(req.body);
    const userHistory = await Transaction.find({ user: req.user._id })
      .select("amount merchant location paymentMethod status createdAt")
      .sort({ createdAt: -1 })
      .limit(100);
    const mlRisk = calculateMlRisk({ transaction: req.body, history: userHistory });
    const combinedScore = Math.min(100, baseRisk.score + mlRisk.scoreBoost);
    const riskBand = toRiskBand(combinedScore);
    const risk = {
      score: combinedScore,
      level: riskBand.level,
      status: riskBand.status,
      reasons: [...baseRisk.reasons, ...mlRisk.reasons]
    };
    const incomingFaceSignature = String(req.body.faceSignature || "");
    let finalStatus = risk.status;

    if (risk.level === "high" || risk.level === "medium") {
      const user = await User.findById(req.user._id).select("faceSignature email");
      const normalizedEmail = String(req.user.email || "").toLowerCase();
      const providedChallengeId = String(req.body.transactionChallengeId || "").trim();

      if (risk.level === "high" || risk.level === "medium") {
        if (!user?.faceSignature) {
          res.status(403);
          throw new Error("Face enrollment missing. Please re-register your account.");
        }
        if (!isValidFaceSignature(incomingFaceSignature)) {
          return res.status(202).json({
            requiresFaceRetry: true,
            message: `${
              risk.level === "high" ? "High" : "Medium"
            }-risk transaction: live face capture is required.`
          });
        }
        const distance = faceSignatureDistance(user.faceSignature, incomingFaceSignature);
        if (distance > FACE_MATCH_MAX_DISTANCE) {
          return res.status(202).json({
            requiresFaceRetry: true,
            message: `${
              risk.level === "high" ? "High" : "Medium"
            }-risk transaction: face mismatch. Please recapture and try again.`,
            faceDistance: distance,
            faceThreshold: FACE_MATCH_MAX_DISTANCE
          });
        }
      }

      if (risk.level === "medium" || risk.level === "high") {
        if (!providedChallengeId) {
          const code = createMatchNumber();
          const choiceOptions = buildThreeChoices(code);
          const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
          await Otp.deleteMany({ email: normalizedEmail, purpose: "transaction" });
          const challenge = await Otp.create({
            email: normalizedEmail,
            purpose: "transaction",
            code,
            expiresAt,
            challengeOptions: choiceOptions,
            isVerified: false,
            verifiedAt: null
          });
          const origin = process.env.API_PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;
          const links = choiceOptions
            .map((choice) => {
              const sig = signChallenge({
                challengeId: challenge._id.toString(),
                value: choice,
                email: req.user.email
              });
              return `${choice}: ${origin}/api/transactions/number-match/verify?challengeId=${challenge._id}&choice=${choice}&sig=${sig}`;
            })
            .join("\n");
          await sendEmail({
            to: req.user.email,
            subject: `FraudShield ${risk.level}-risk number match`,
            text: `On your FraudShield screen, the number is: ${code}\n\nClick the matching number below:\n${links}\n\nThis challenge expires in 10 minutes.`
          });
          return res.status(202).json({
            requiresNumberMatch: true,
            biometricOptional: true,
            otpType: "number_match",
            challengeId: challenge._id,
            displayNumber: code,
            expiresInMinutes: 10,
            message: `${risk.level === "high" ? "High" : "Medium"}-risk transaction: complete email number match to continue. Biometric is optional if your device supports it.`
          });
        }

        const verifiedChallenge = await Otp.findOne({
          _id: providedChallengeId,
          email: normalizedEmail,
          purpose: "transaction",
          isVerified: true,
          expiresAt: { $gt: new Date() }
        });
        if (!verifiedChallenge) {
          res.status(401);
          throw new Error("Number-match challenge is not verified or has expired");
        }
        await Otp.deleteMany({ email: normalizedEmail, purpose: "transaction" });
        finalStatus = "approved";
      }
    }

    const { faceSignature, transactionOtp, ...transactionPayload } = req.body;
    const transaction = await Transaction.create({
      ...transactionPayload,
      user: req.user._id,
      riskScore: risk.score,
      riskLevel: risk.level,
      status: finalStatus,
      reasons: risk.reasons,
      mlMeta: {
        confidence: mlRisk.confidence,
        confidenceScore: mlRisk.confidenceScore,
        scoreBoost: mlRisk.scoreBoost,
        features: mlRisk.features
      }
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

export const verifyTransactionNumberMatch = async (req, res, next) => {
  try {
    const challengeId = String(req.query.challengeId || "").trim();
    const choice = String(req.query.choice || "").trim();
    const sig = String(req.query.sig || "").trim();

    if (!challengeId || !choice || !sig) {
      res.status(400);
      throw new Error("Missing challenge verification parameters");
    }

    const challenge = await Otp.findById(challengeId);
    if (!challenge || challenge.purpose !== "transaction") {
      res.status(404);
      throw new Error("Challenge not found");
    }
    if (challenge.expiresAt <= new Date()) {
      res.status(410);
      throw new Error("Challenge expired");
    }

    const expectedSig = signChallenge({
      challengeId,
      value: choice,
      email: challenge.email
    });
    if (sig !== expectedSig) {
      res.status(401);
      throw new Error("Invalid challenge signature");
    }

    if (choice !== challenge.code) {
      res.status(401);
      throw new Error("Wrong number selected");
    }

    challenge.isVerified = true;
    challenge.verifiedAt = new Date();
    await challenge.save();

    res.send(
      "<h2>FraudShield: Number Match Verified</h2><p>You can return to the app and submit the transaction now.</p>"
    );
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

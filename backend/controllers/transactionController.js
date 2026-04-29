import Alert from "../models/Alert.js";
import Transaction from "../models/Transaction.js";
import { sendEmail } from "../utils/sendEmail.js";
import { calculateRisk } from "../utils/riskEngine.js";

const hasLetter = (value) => /[A-Za-z]/.test(String(value || ""));
const isRealName = (value) => /^[A-Za-z]+(?:\s+[A-Za-z]+)+$/.test(String(value || "").trim());

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
    const transaction = await Transaction.create({
      ...req.body,
      user: req.user._id,
      riskScore: risk.score,
      riskLevel: risk.level,
      status: risk.status,
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

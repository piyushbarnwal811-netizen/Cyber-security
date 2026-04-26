import Alert from "../models/Alert.js";
import Transaction from "../models/Transaction.js";
import { calculateRisk } from "../utils/riskEngine.js";

export const createTransaction = async (req, res, next) => {
  try {
    const risk = calculateRisk(req.body);
    const transaction = await Transaction.create({
      ...req.body,
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
    }

    res.status(201).json(transaction);
  } catch (error) {
    next(error);
  }
};

export const getTransactions = async (req, res, next) => {
  try {
    const transactions = await Transaction.find().sort({ createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    next(error);
  }
};

export const getTransactionById = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      res.status(404);
      throw new Error("Transaction not found");
    }

    res.json(transaction);
  } catch (error) {
    next(error);
  }
};

import express from "express";
import {
  createTransaction,
  getTransactionById,
  getTransactions,
  verifyTransactionNumberMatch
} from "../controllers/transactionController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/").get(protect, getTransactions).post(protect, createTransaction);
router.get("/number-match/verify", verifyTransactionNumberMatch);
router.get("/:id", protect, getTransactionById);

export default router;

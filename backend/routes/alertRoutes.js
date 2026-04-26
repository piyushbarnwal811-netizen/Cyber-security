import express from "express";
import { getAlerts, resolveAlert } from "../controllers/alertController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getAlerts);
router.patch("/:id/resolve", protect, resolveAlert);

export default router;

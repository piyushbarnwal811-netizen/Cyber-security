import express from "express";
import {
  getProfile,
  loginUser,
  registerUser,
  requestOtp
} from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/request-otp", requestOtp);
router.get("/profile", protect, getProfile);

export default router;

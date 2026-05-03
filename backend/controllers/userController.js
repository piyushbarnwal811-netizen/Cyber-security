import jwt from "jsonwebtoken";
import Otp from "../models/Otp.js";
import User from "../models/User.js";
import { isValidFaceSignature } from "../utils/faceSignature.js";
import { sendEmail } from "../utils/sendEmail.js";
import { buildOtpAuthUrl, generateTotpSecret, verifyTotpAcrossPeriods } from "../utils/totp.js";

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET || "dev_secret", { expiresIn: "7d" });

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const normalizeOtp = (otp) => String(otp || "").trim().replace(/\s+/g, "");

const createOtpCode = () => String(Math.floor(100000 + Math.random() * 900000));
const TOTP_PRIMARY_PERIOD = Number(process.env.TOTP_PERIOD_SECONDS || 30);
const TOTP_VERIFY_WINDOW = Number(process.env.TOTP_VERIFY_WINDOW || 2);
const TOTP_ACCEPT_PERIODS = [
  TOTP_PRIMARY_PERIOD,
  ...String(process.env.TOTP_ACCEPT_PERIODS || "20,30")
    .split(",")
    .map((v) => Number(v.trim()))
    .filter((v) => v > 0)
];

const verifyOtp = async ({ email, purpose, otp }) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedOtp = normalizeOtp(otp);
  const now = new Date();

  let record = await Otp.findOne({
    email: normalizedEmail,
    purpose,
    code: normalizedOtp,
    expiresAt: { $gt: now }
  });

  // Fallback: accept the latest valid OTP for this email to avoid purpose mismatch friction.
  if (!record) {
    record = await Otp.findOne({
      email: normalizedEmail,
      code: normalizedOtp,
      expiresAt: { $gt: now }
    });
  }

  if (!record) return false;
  await Otp.deleteMany({ email: normalizedEmail });
  return true;
};

export const requestOtp = async (req, res, next) => {
  try {
    const { email, purpose, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !purpose) {
      res.status(400);
      throw new Error("Email and purpose are required");
    }

    if (!["login", "register"].includes(purpose)) {
      res.status(400);
      throw new Error("Purpose must be login or register");
    }

    if (purpose === "register") {
      const exists = await User.findOne({ email: normalizedEmail });
      if (exists) {
        res.status(409);
        throw new Error("User already exists");
      }
    }

    if (purpose === "login") {
      const user = await User.findOne({ email: normalizedEmail });
      if (!user || !(await user.matchPassword(password || ""))) {
        res.status(401);
        throw new Error("Invalid email or password");
      }

      if (user.totpEnabled && user.totpSecret) {
        res.json({
          message: "TOTP is enabled. Use the 6-digit code from your authenticator app.",
          periodSeconds: TOTP_PRIMARY_PERIOD
        });
        return;
      }
    }

    const code = createOtpCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await Otp.deleteMany({ email: normalizedEmail });
    await Otp.create({ email: normalizedEmail, purpose, code, expiresAt });

    await sendEmail({
      to: normalizedEmail,
      subject: `FraudShield ${purpose} OTP`,
      text: `Your OTP is ${code}. It expires in 10 minutes.`
    });

    res.json({ message: "OTP sent to your email", expiresInMinutes: 10 });
  } catch (error) {
    next(error);
  }
};

export const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, otp, faceSignature } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const exists = await User.findOne({ email: normalizedEmail });

    if (exists) {
      res.status(409);
      throw new Error("User already exists");
    }

    const otpValid = await verifyOtp({
      email: normalizedEmail,
      purpose: "register",
      otp
    });
    if (!otpValid) {
      res.status(401);
      throw new Error("Invalid or expired OTP");
    }

    if (!isValidFaceSignature(faceSignature)) {
      res.status(400);
      throw new Error("Live face capture is required for registration");
    }

    const user = await User.create({
      name,
      email: normalizedEmail,
      password,
      faceSignature
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id)
    });
  } catch (error) {
    next(error);
  }
};

export const loginUser = async (req, res, next) => {
  try {
    const { email, password, otp } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });

    if (!user || !(await user.matchPassword(password))) {
      res.status(401);
      throw new Error("Invalid email or password");
    }

    let otpValid = false;
    if (user.totpEnabled && user.totpSecret) {
      otpValid = verifyTotpAcrossPeriods({
        token: otp,
        secret: user.totpSecret,
        periods: TOTP_ACCEPT_PERIODS,
        window: TOTP_VERIFY_WINDOW
      });

      // Dev-friendly fallback: if authenticator code fails, allow latest email OTP.
      if (!otpValid) {
        otpValid = await verifyOtp({
          email: normalizedEmail,
          purpose: "login",
          otp
        });
      }
    } else {
      otpValid = await verifyOtp({
        email: normalizedEmail,
        purpose: "login",
        otp
      });
    }
    if (!otpValid) {
      res.status(401);
      throw new Error("Invalid or expired OTP");
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id)
    });
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (req, res) => {
  res.json(req.user);
};

export const setupTotp = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }
    const secret = generateTotpSecret();
    user.totpSecret = secret;
    user.totpEnabled = false;
    await user.save();

    const issuer = process.env.TOTP_ISSUER || "FraudShield AI";
    const otpauthUrl = buildOtpAuthUrl({
      issuer,
      email: user.email,
      secret,
      period: TOTP_PRIMARY_PERIOD
    });

    res.json({
      message: "TOTP secret generated. Add it in authenticator app and verify once.",
      secret,
      otpauthUrl,
      periodSeconds: TOTP_PRIMARY_PERIOD
    });
  } catch (error) {
    next(error);
  }
};

export const verifyAndEnableTotp = async (req, res, next) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user._id);
    if (!user?.totpSecret) {
      res.status(400);
      throw new Error("TOTP setup is not initialized");
    }
    const ok = verifyTotpAcrossPeriods({
      token,
      secret: user.totpSecret,
      periods: TOTP_ACCEPT_PERIODS,
      window: TOTP_VERIFY_WINDOW
    });
    if (!ok) {
      res.status(401);
      throw new Error("Invalid TOTP code");
    }
    user.totpEnabled = true;
    await user.save();
    res.json({ message: "TOTP enabled successfully" });
  } catch (error) {
    next(error);
  }
};

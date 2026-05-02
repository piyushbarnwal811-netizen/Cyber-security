import { Plus } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { createFaceSignatureFromVideo } from "../utils/faceSignature.js";

const initialState = {
  customerName: "",
  amount: "",
  merchant: "Grocery Store",
  customMerchant: "",
  location: "",
  paymentMethod: "card"
};

const merchantOptions = [
  "Grocery Store",
  "Restaurant",
  "Fuel Station",
  "Pharmacy",
  "Electronics Store",
  "Clothing Store",
  "E-commerce",
  "Travel Booking",
  "Utility Bill",
  "Hospital",
  "Education",
  "Other"
];

export default function TransactionForm({ onSubmit }) {
  const [form, setForm] = useState(initialState);
  const [error, setError] = useState("");
  const [faceSignature, setFaceSignature] = useState("");
  const [transactionOtp, setTransactionOtp] = useState("");
  const [otpRequired, setOtpRequired] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(
    () => () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    },
    []
  );

  const update = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const hasLetter = (value) => /[A-Za-z]/.test(String(value || ""));
  const isRealName = (value) => /^[A-Za-z]+(?:\s+[A-Za-z]+)+$/.test(String(value || "").trim());

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    const merchantValue =
      form.merchant === "Other" ? String(form.customMerchant || "").trim() : form.merchant;
    const payload = { ...form, merchant: merchantValue, amount: Number(form.amount) };
    const normalizedLocation = String(payload.location || "").trim().toLowerCase();
    const riskyLocation = ["unknown", "offshore", "blocked-region"].includes(normalizedLocation);
    const estimatedHighRisk = payload.amount >= 100000 && riskyLocation;
    if (String(payload.customerName || "").trim().length < 3 || !isRealName(payload.customerName)) {
      setError("Customer name must be a real name (first and last name, letters only).");
      return;
    }
    if (!Number.isFinite(payload.amount) || payload.amount <= 0) {
      setError("Amount must be greater than 0.");
      return;
    }
    if (String(payload.merchant || "").trim().length < 2 || !hasLetter(payload.merchant)) {
      setError("Merchant must be at least 2 characters and include letters.");
      return;
    }
    if (estimatedHighRisk && !faceSignature) {
      setError("High-risk payment needs live face verification. Start camera and capture face.");
      return;
    }

    const result = await onSubmit({ ...payload, faceSignature, transactionOtp });
    if (result?.requiresOtp) {
      setOtpRequired(true);
      return;
    }
    setOtpRequired(false);
    setTransactionOtp("");
    setForm(initialState);
    setFaceSignature("");
  };

  const startCamera = async () => {
    setCameraError("");
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setCameraError("Camera access denied or unavailable.");
    }
  };

  const captureFace = () => {
    if (!videoRef.current) return;
    setFaceSignature(createFaceSignatureFromVideo(videoRef.current));
  };

  return (
    <form className="transaction-form" onSubmit={submit}>
      <input
        name="customerName"
        placeholder="Customer name"
        value={form.customerName}
        onChange={update}
        pattern="[A-Za-z]+(?:\s+[A-Za-z]+)+"
        title="Enter first and last name using letters only."
        required
      />
      <input
        name="amount"
        type="number"
        placeholder="Amount"
        value={form.amount}
        onChange={update}
        min="0.01"
        step="0.01"
        required
      />
      <select name="merchant" value={form.merchant} onChange={update}>
        {merchantOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {form.merchant === "Other" && (
        <input
          name="customMerchant"
          placeholder="Enter merchant name"
          value={form.customMerchant}
          onChange={update}
          required
        />
      )}
      <input
        name="location"
        placeholder="Location"
        value={form.location}
        onChange={update}
        required
      />
      <select name="paymentMethod" value={form.paymentMethod} onChange={update}>
        <option value="card">Card</option>
        <option value="upi">UPI</option>
        <option value="netbanking">Net banking</option>
        <option value="wallet">Wallet</option>
      </select>
      <button type="submit">
        <Plus size={16} />
        Add Transaction
      </button>
      <div className="face-capture transaction-face">
        <strong>Payment Face Check (required for high-risk)</strong>
        <video ref={videoRef} autoPlay muted playsInline />
        <div className="face-actions">
          <button className="secondary-button" type="button" onClick={startCamera}>
            Start Camera
          </button>
          <button className="secondary-button" type="button" onClick={captureFace}>
            Capture Face
          </button>
        </div>
        {faceSignature && <p>Live face captured for verification.</p>}
        {otpRequired && (
          <>
            <input
              placeholder="Enter high-risk OTP"
              value={transactionOtp}
              onChange={(e) => setTransactionOtp(String(e.target.value || "").replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              maxLength={6}
            />
            <p>OTP required for high-risk payment. Enter OTP and submit again.</p>
          </>
        )}
        {cameraError && <p className="form-error">{cameraError}</p>}
      </div>
      {error && <p className="form-error">{error}</p>}
    </form>
  );
}

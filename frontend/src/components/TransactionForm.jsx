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
  const [numberMatchRequired, setNumberMatchRequired] = useState(false);
  const [biometricOptional, setBiometricOptional] = useState(false);
  const [challengeId, setChallengeId] = useState("");
  const [displayNumber, setDisplayNumber] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [locationStatus, setLocationStatus] = useState("Detecting location...");
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

  useEffect(() => {
    const updateLocation = () => {
      if (!navigator.geolocation) {
        setLocationStatus("Location unavailable on this browser.");
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(5);
          const lon = pos.coords.longitude.toFixed(5);
          setForm((prev) => ({ ...prev, location: `auto:${lat},${lon}` }));
          setLocationStatus(`Auto location: ${lat}, ${lon}`);
        },
        () => {
          setLocationStatus("Location permission denied. Please allow location.");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
    };

    updateLocation();
  }, []);

  const update = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const hasLetter = (value) => /[A-Za-z]/.test(String(value || ""));
  const isRealName = (value) => /^[A-Za-z]+(?:\s+[A-Za-z]+)+$/.test(String(value || "").trim());

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setInfoMessage("");

    const merchantValue =
      form.merchant === "Other" ? String(form.customMerchant || "").trim() : form.merchant;
    const payload = { ...form, merchant: merchantValue, amount: Number(form.amount) };
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
    if (!String(payload.location || "").trim()) {
      setError("Location auto-detect failed. Please allow location permission and try again.");
      return;
    }
    const result = await onSubmit({
      ...payload,
      faceSignature,
      transactionOtp,
      transactionChallengeId: challengeId || undefined
    });
    if (result?.requiresOtp) {
      setOtpRequired(true);
      setInfoMessage(result?.message || "OTP verification required.");
      return;
    }
    if (result?.requiresNumberMatch) {
      setNumberMatchRequired(true);
      setBiometricOptional(Boolean(result.biometricOptional));
      setChallengeId(String(result.challengeId || ""));
      setDisplayNumber(String(result.displayNumber || ""));
      setInfoMessage(result?.message || "Number match required.");
      return;
    }
    if (result?.requiresFaceRetry) {
      setInfoMessage(result?.message || "Face recapture required.");
      return;
    }
    setOtpRequired(false);
    setNumberMatchRequired(false);
    setBiometricOptional(false);
    setChallengeId("");
    setDisplayNumber("");
    setInfoMessage("");
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
      <input name="location" value={form.location} readOnly />
      <p>{locationStatus}</p>
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
        <strong>Payment Face Check (required for medium/high risk)</strong>
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
        {numberMatchRequired && (
          <>
            <p>
              Number Match Required: <strong>{displayNumber}</strong>
            </p>
            {biometricOptional && (
              <p>Biometric is optional. If not available on your laptop, continue with email number match.</p>
            )}
            <p>Check your email and click the same number, then submit transaction again.</p>
          </>
        )}
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
        {infoMessage && <p>{infoMessage}</p>}
        {cameraError && <p className="form-error">{cameraError}</p>}
      </div>
      {error && <p className="form-error">{error}</p>}
    </form>
  );
}

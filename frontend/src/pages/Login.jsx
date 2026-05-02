import { Shield } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { register, requestOtp } from "../services/userService.js";
import { createFaceSignatureFromVideo } from "../utils/faceSignature.js";

export default function Login() {
  const { demoSignIn, signIn } = useAuth();
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", otp: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [faceSignature, setFaceSignature] = useState("");
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const cleanOtp = (value) => String(value || "").replace(/\D/g, "").slice(0, 6);

  useEffect(
    () => () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    },
    []
  );

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      if (isRegistering) {
        if (!faceSignature) {
          setError("Please capture your live face before creating account.");
          return;
        }
        await register({ ...form, otp: cleanOtp(form.otp).trim(), faceSignature });
        setIsRegistering(false);
        setForm({ ...form, otp: "" });
        setFaceSignature("");
        setMessage("Account created. Please request a new OTP and login.");
        return;
      }
      await signIn({
        email: form.email,
        password: form.password,
        otp: cleanOtp(form.otp).trim()
      });
      navigate("/");
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Request failed. Please check the details and try again.";
      setError(message);
    }
  };

  const sendOtp = async () => {
    setError("");
    setMessage("");
    setSendingOtp(true);
    try {
      await requestOtp({
        email: form.email,
        password: form.password,
        purpose: isRegistering ? "register" : "login"
      });
      setMessage("OTP sent to your email. Please enter it below.");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Unable to send OTP. Please try again.";
      setError(msg);
    } finally {
      setSendingOtp(false);
    }
  };

  const openDemo = () => {
    demoSignIn();
    navigate("/");
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
    const signature = createFaceSignatureFromVideo(videoRef.current);
    setFaceSignature(signature);
    setMessage("Face captured successfully.");
  };

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="brand large">
          <Shield size={36} />
          <div>
            <strong>FraudShield AI</strong>
            <span>Real-time fraud intelligence</span>
          </div>
        </div>
        <form onSubmit={submit}>
          {isRegistering && (
            <label>
              Name
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </label>
          )}
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </label>
          <label>
            Password
            <div className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>
          <label>
            OTP
            <input
              value={form.otp}
              onChange={(e) => setForm({ ...form, otp: cleanOtp(e.target.value) })}
              placeholder="Enter 6-digit OTP"
              inputMode="numeric"
              maxLength={6}
              required
            />
          </label>
          {isRegistering && (
            <div className="face-capture">
              <strong>Live Face Verification</strong>
              <video ref={videoRef} autoPlay muted playsInline />
              <div className="face-actions">
                <button className="secondary-button" type="button" onClick={startCamera}>
                  Start Camera
                </button>
                <button className="secondary-button" type="button" onClick={captureFace}>
                  Capture Face
                </button>
              </div>
              {faceSignature && <p>Face captured and linked to your account.</p>}
              {cameraError && <p className="form-error">{cameraError}</p>}
            </div>
          )}
          <button
            className="secondary-button"
            type="button"
            onClick={sendOtp}
            disabled={!form.email || !form.password || sendingOtp}
          >
            {sendingOtp ? "Sending OTP..." : "Send OTP"}
          </button>
          {message && <p>{message}</p>}
          {error && <p className="form-error">{error}</p>}
          <button type="submit">{isRegistering ? "Create Account" : "Login"}</button>
          <button
            className="link-button"
            type="button"
            onClick={() => setIsRegistering(!isRegistering)}
          >
            {isRegistering ? "Use existing account" : "Create new account"}
          </button>
          <button className="secondary-button" type="button" onClick={openDemo}>
            Open Demo Dashboard
          </button>
        </form>
      </section>
    </main>
  );
}

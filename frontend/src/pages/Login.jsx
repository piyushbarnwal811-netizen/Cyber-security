import { Shield } from "lucide-react";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { register, requestOtp } from "../services/userService.js";

export default function Login() {
  const { demoSignIn, signIn } = useAuth();
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", otp: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const cleanOtp = (value) => String(value || "").replace(/\D/g, "").slice(0, 6);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      if (isRegistering) {
        await register({ ...form, otp: cleanOtp(form.otp).trim() });
        setIsRegistering(false);
        setForm({ ...form, otp: "" });
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

import { Shield } from "lucide-react";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { register } from "../services/userService.js";

export default function Login() {
  const { demoSignIn, signIn } = useAuth();
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      if (isRegistering) {
        await register(form);
      }

      await signIn({ email: form.email, password: form.password });
      navigate("/");
    } catch {
      setError("Request failed. Please check the details and try again.");
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
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </label>
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

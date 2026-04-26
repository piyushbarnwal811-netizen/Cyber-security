import React from "react";
import { LogOut, Search, ShieldCheck } from "lucide-react";
import { useAuth } from "../hooks/useAuth.js";

export default function Navbar() {
  const { user, signOut } = useAuth();

  return (
    <header className="navbar">
      <div>
        <p className="eyebrow">Fraud monitoring console</p>
        <h1>FraudShield AI</h1>
      </div>
      <div className="nav-actions">
        <div className="search-box">
          <Search size={18} />
          <input placeholder="Search customer, merchant, alert..." />
        </div>
        <div className="user-pill">
          <ShieldCheck size={18} />
          <span>{user?.name || "Analyst"}</span>
        </div>
        <button className="icon-button" onClick={signOut} title="Log out">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}

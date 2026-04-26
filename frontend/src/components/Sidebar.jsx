import React from "react";
import { Bell, CreditCard, LayoutDashboard, Shield, User } from "lucide-react";
import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/transactions", label: "Transactions", icon: CreditCard },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/profile", label: "Profile", icon: User }
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <Shield size={28} />
        <div>
          <strong>FraudShield</strong>
          <span>AI Risk Engine</span>
        </div>
      </div>
      <nav>
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to}>
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

import React from "react";
import { Mail, ShieldCheck, UserRound } from "lucide-react";
import { useAuth } from "../hooks/useAuth.js";

export default function Profile() {
  const { user } = useAuth();

  return (
    <div className="page">
      <div className="panel profile-panel">
        <div className="avatar">
          <UserRound size={40} />
        </div>
        <h2>{user?.name}</h2>
        <div className="profile-row">
          <Mail size={18} />
          <span>{user?.email}</span>
        </div>
        <div className="profile-row">
          <ShieldCheck size={18} />
          <span>{user?.role}</span>
        </div>
      </div>
    </div>
  );
}

import React from "react";

export default function RiskCard({ label, value, tone = "neutral" }) {
  return (
    <section className={`metric-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </section>
  );
}

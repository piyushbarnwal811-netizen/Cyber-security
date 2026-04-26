import React from "react";
import { CheckCircle2 } from "lucide-react";
import { formatDate } from "../utils/formatDate.js";

export default function AlertCard({ alert, onResolve }) {
  return (
    <article className={`alert-card ${alert.severity}`}>
      <div>
        <div className="alert-head">
          <strong>{alert.title}</strong>
          <span>{alert.severity}</span>
        </div>
        <p>{alert.message}</p>
        <small>{formatDate(alert.createdAt || Date.now())}</small>
      </div>
      {!alert.resolved && (
        <button onClick={() => onResolve(alert._id)}>
          <CheckCircle2 size={16} />
          Resolve
        </button>
      )}
    </article>
  );
}

import React, { useEffect, useState } from "react";
import AlertCard from "../components/AlertCard.jsx";
import { getAlerts, resolveAlert } from "../services/alertService.js";
import { demoAlerts } from "../utils/demoData.js";

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState("");

  const loadAlerts = async () => {
    try {
      setAlerts(await getAlerts());
      setError("");
    } catch {
      setAlerts(demoAlerts);
      setError("Backend is not connected, so demo alerts are being shown.");
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const markResolved = async (id) => {
    try {
      await resolveAlert(id);
      await loadAlerts();
    } catch {
      setAlerts(
        alerts.map((alert) =>
          alert._id === id ? { ...alert, resolved: true } : alert
        )
      );
    }
  };

  return (
    <div className="page">
      {error && <div className="notice">{error}</div>}
      <div className="panel">
        <h2>Fraud Alerts</h2>
        <div className="alert-list">
          {alerts.map((alert) => (
            <AlertCard key={alert._id} alert={alert} onResolve={markResolved} />
          ))}
        </div>
      </div>
    </div>
  );
}

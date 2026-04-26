import React, { useEffect, useMemo, useState } from "react";
import Loader from "../components/Loader.jsx";
import RiskCard from "../components/RiskCard.jsx";
import { getAlerts } from "../services/alertService.js";
import { getTransactions } from "../services/transactionService.js";
import { demoAlerts, demoTransactions } from "../utils/demoData.js";
import { formatDate } from "../utils/formatDate.js";

export default function Dashboard() {
  const [transactions, setTransactions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getTransactions(), getAlerts()])
      .then(([txData, alertData]) => {
        setTransactions(txData);
        setAlerts(alertData);
      })
      .catch(() => {
        setTransactions(demoTransactions);
        setAlerts(demoAlerts);
        setError("Backend is not connected, so demo data is being shown.");
      })
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const total = transactions.length;
    const highRisk = transactions.filter((tx) => tx.riskLevel === "high").length;
    const review = transactions.filter((tx) => tx.status === "review").length;
    const openAlerts = alerts.filter((alert) => !alert.resolved).length;

    return { total, highRisk, review, openAlerts };
  }, [transactions, alerts]);

  if (loading) return <Loader />;

  return (
    <div className="page">
      {error && <div className="notice">{error}</div>}
      <section className="metrics-grid">
        <RiskCard label="Transactions" value={stats.total} />
        <RiskCard label="High Risk" value={stats.highRisk} tone="danger" />
        <RiskCard label="In Review" value={stats.review} tone="warning" />
        <RiskCard label="Open Alerts" value={stats.openAlerts} tone="info" />
      </section>

      <section className="content-grid">
        <div className="panel">
          <h2>Recent Transactions</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Merchant</th>
                  <th>Amount</th>
                  <th>Risk</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 6).map((tx) => (
                  <tr key={tx._id}>
                    <td>{tx.customerName}</td>
                    <td>{tx.merchant}</td>
                    <td>₹{tx.amount.toLocaleString("en-IN")}</td>
                    <td>
                      <span className={`status ${tx.riskLevel}`}>{tx.riskLevel}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <h2>Latest Alerts</h2>
          <div className="timeline">
            {alerts.slice(0, 5).map((alert) => (
              <div key={alert._id} className="timeline-item">
                <strong>{alert.title}</strong>
                <span>{formatDate(alert.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

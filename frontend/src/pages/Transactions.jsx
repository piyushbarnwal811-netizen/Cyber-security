import React, { useEffect, useState } from "react";
import TransactionForm from "../components/TransactionForm.jsx";
import { createTransaction, getTransactions } from "../services/transactionService.js";
import { demoTransactions } from "../utils/demoData.js";
import { formatDate } from "../utils/formatDate.js";

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState("");

  const loadTransactions = async () => {
    try {
      setTransactions(await getTransactions());
      setError("");
    } catch {
      setTransactions(demoTransactions);
      setError("Backend is not connected, so demo transactions are being shown.");
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const addTransaction = async (payload) => {
    try {
      await createTransaction(payload);
      await loadTransactions();
    } catch {
      setTransactions([
        {
          ...payload,
          _id: crypto.randomUUID(),
          status: payload.amount >= 75000 ? "blocked" : "approved",
          riskScore: payload.amount >= 75000 ? 80 : 10,
          riskLevel: payload.amount >= 75000 ? "high" : "low",
          createdAt: new Date().toISOString()
        },
        ...transactions
      ]);
      setError("Backend is not connected. The new transaction was added only in this browser session.");
    }
  };

  return (
    <div className="page">
      {error && <div className="notice">{error}</div>}
      <div className="panel">
        <h2>New Transaction</h2>
        <TransactionForm onSubmit={addTransaction} />
      </div>

      <div className="panel">
        <h2>Transaction History</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Amount</th>
                <th>Merchant</th>
                <th>Status</th>
                <th>Risk Score</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx._id}>
                  <td>{tx.customerName}</td>
                  <td>₹{tx.amount.toLocaleString("en-IN")}</td>
                  <td>{tx.merchant}</td>
                  <td>
                    <span className={`status ${tx.status}`}>{tx.status}</span>
                  </td>
                  <td>{tx.riskScore}</td>
                  <td>{formatDate(tx.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

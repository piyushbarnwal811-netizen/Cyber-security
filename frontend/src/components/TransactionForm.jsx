import { Plus } from "lucide-react";
import React, { useState } from "react";

const initialState = {
  customerName: "",
  amount: "",
  merchant: "Grocery Store",
  customMerchant: "",
  location: "",
  paymentMethod: "card"
};

const merchantOptions = [
  "Grocery Store",
  "Restaurant",
  "Fuel Station",
  "Pharmacy",
  "Electronics Store",
  "Clothing Store",
  "E-commerce",
  "Travel Booking",
  "Utility Bill",
  "Hospital",
  "Education",
  "Other"
];

export default function TransactionForm({ onSubmit }) {
  const [form, setForm] = useState(initialState);
  const [error, setError] = useState("");

  const update = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const hasLetter = (value) => /[A-Za-z]/.test(String(value || ""));
  const isRealName = (value) => /^[A-Za-z]+(?:\s+[A-Za-z]+)+$/.test(String(value || "").trim());

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    const merchantValue =
      form.merchant === "Other" ? String(form.customMerchant || "").trim() : form.merchant;
    const payload = { ...form, merchant: merchantValue, amount: Number(form.amount) };
    if (String(payload.customerName || "").trim().length < 3 || !isRealName(payload.customerName)) {
      setError("Customer name must be a real name (first and last name, letters only).");
      return;
    }
    if (!Number.isFinite(payload.amount) || payload.amount <= 0) {
      setError("Amount must be greater than 0.");
      return;
    }
    if (String(payload.merchant || "").trim().length < 2 || !hasLetter(payload.merchant)) {
      setError("Merchant must be at least 2 characters and include letters.");
      return;
    }

    await onSubmit(payload);
    setForm(initialState);
  };

  return (
    <form className="transaction-form" onSubmit={submit}>
      <input
        name="customerName"
        placeholder="Customer name"
        value={form.customerName}
        onChange={update}
        pattern="[A-Za-z]+(?:\s+[A-Za-z]+)+"
        title="Enter first and last name using letters only."
        required
      />
      <input
        name="amount"
        type="number"
        placeholder="Amount"
        value={form.amount}
        onChange={update}
        min="0.01"
        step="0.01"
        required
      />
      <select name="merchant" value={form.merchant} onChange={update}>
        {merchantOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {form.merchant === "Other" && (
        <input
          name="customMerchant"
          placeholder="Enter merchant name"
          value={form.customMerchant}
          onChange={update}
          required
        />
      )}
      <input
        name="location"
        placeholder="Location"
        value={form.location}
        onChange={update}
        required
      />
      <select name="paymentMethod" value={form.paymentMethod} onChange={update}>
        <option value="card">Card</option>
        <option value="upi">UPI</option>
        <option value="netbanking">Net banking</option>
        <option value="wallet">Wallet</option>
      </select>
      <button type="submit">
        <Plus size={16} />
        Add Transaction
      </button>
      {error && <p className="form-error">{error}</p>}
    </form>
  );
}

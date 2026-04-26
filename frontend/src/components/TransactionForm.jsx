import { Plus } from "lucide-react";
import React, { useState } from "react";

const initialState = {
  customerName: "",
  amount: "",
  merchant: "",
  location: "",
  paymentMethod: "card"
};

export default function TransactionForm({ onSubmit }) {
  const [form, setForm] = useState(initialState);

  const update = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const submit = async (event) => {
    event.preventDefault();
    await onSubmit({ ...form, amount: Number(form.amount) });
    setForm(initialState);
  };

  return (
    <form className="transaction-form" onSubmit={submit}>
      <input
        name="customerName"
        placeholder="Customer name"
        value={form.customerName}
        onChange={update}
        required
      />
      <input
        name="amount"
        type="number"
        placeholder="Amount"
        value={form.amount}
        onChange={update}
        required
      />
      <input
        name="merchant"
        placeholder="Merchant"
        value={form.merchant}
        onChange={update}
        required
      />
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
    </form>
  );
}

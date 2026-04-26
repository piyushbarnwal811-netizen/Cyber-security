export const demoTransactions = [
  {
    _id: "demo-tx-1",
    customerName: "Aarav Sharma",
    amount: 125000,
    merchant: "ElectroMart",
    location: "Unknown",
    paymentMethod: "card",
    status: "blocked",
    riskScore: 80,
    riskLevel: "high",
    createdAt: new Date().toISOString()
  },
  {
    _id: "demo-tx-2",
    customerName: "Neha Verma",
    amount: 42000,
    merchant: "TravelHub",
    location: "Mumbai",
    paymentMethod: "upi",
    status: "approved",
    riskScore: 10,
    riskLevel: "low",
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString()
  },
  {
    _id: "demo-tx-3",
    customerName: "Rohan Mehta",
    amount: 68000,
    merchant: "QuickWallet",
    location: "Delhi",
    paymentMethod: "wallet",
    status: "review",
    riskScore: 45,
    riskLevel: "medium",
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString()
  }
];

export const demoAlerts = [
  {
    _id: "demo-alert-1",
    title: "HIGH risk transaction",
    message: "Very high transaction amount, unusual or risky transaction location",
    severity: "critical",
    resolved: false,
    createdAt: new Date().toISOString()
  },
  {
    _id: "demo-alert-2",
    title: "MEDIUM risk transaction",
    message: "High transaction amount, wallet payment requires additional review",
    severity: "medium",
    resolved: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString()
  }
];

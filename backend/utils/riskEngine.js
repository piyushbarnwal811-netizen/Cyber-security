export const calculateRisk = (transaction) => {
  let score = 10;
  const reasons = [];

  if (transaction.amount >= 100000) {
    score += 45;
    reasons.push("Very high transaction amount");
  } else if (transaction.amount >= 50000) {
    score += 25;
    reasons.push("High transaction amount");
  }

  const riskyLocations = ["unknown", "offshore", "blocked-region"];
  if (riskyLocations.includes(String(transaction.location).toLowerCase())) {
    score += 25;
    reasons.push("Unusual or risky transaction location");
  }

  if (transaction.paymentMethod === "wallet") {
    score += 10;
    reasons.push("Wallet payment requires additional review");
  }

  score = Math.min(score, 100);

  if (score >= 75) {
    return { score, level: "high", status: "blocked", reasons };
  }

  if (score >= 45) {
    return { score, level: "medium", status: "review", reasons };
  }

  return { score, level: "low", status: "approved", reasons };
};

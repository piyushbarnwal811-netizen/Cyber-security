const safeStd = (value) => (Number.isFinite(value) && value > 0 ? value : 1);
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const toLower = (v) => String(v || "").trim().toLowerCase();

const mean = (values) => {
  if (!values.length) return 0;
  return values.reduce((acc, v) => acc + v, 0) / values.length;
};

const stdDev = (values, avg) => {
  if (values.length < 2) return 1;
  const variance =
    values.reduce((acc, v) => acc + (v - avg) * (v - avg), 0) / (values.length - 1);
  return Math.sqrt(Math.max(variance, 0));
};

const percentile = (values, p) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = clamp(Math.floor((p / 100) * (sorted.length - 1)), 0, sorted.length - 1);
  return sorted[idx];
};

const minutesSince = (timestamp, nowMs) => {
  const ts = new Date(timestamp || 0).getTime();
  if (!Number.isFinite(ts) || ts <= 0) return Infinity;
  return (nowMs - ts) / 60000;
};

export const calculateMlRisk = ({ transaction, history }) => {
  const txAmount = Number(transaction.amount || 0);
  const txMerchant = toLower(transaction.merchant);
  const txLocation = toLower(transaction.location);
  const txPaymentMethod = toLower(transaction.paymentMethod);
  const nowMs = Date.now();

  if (!history.length) {
    return {
      scoreBoost: 0,
      confidence: "low",
      confidenceScore: 0.2,
      reasons: ["ML warm-up: not enough user history"],
      features: {
        historySize: 0,
        amountZScore: 0,
        velocity10Min: 0,
        unseenMerchant: false,
        unseenLocation: false,
        rarePaymentMethod: false
      }
    };
  }

  const amounts = history.map((h) => Number(h.amount || 0)).filter((n) => Number.isFinite(n));
  const avgAmount = mean(amounts);
  const amountStd = safeStd(stdDev(amounts, avgAmount));
  const z = Math.abs((txAmount - avgAmount) / amountStd);
  const p95 = percentile(amounts, 95);
  const p99 = percentile(amounts, 99);

  const merchantSet = new Set(history.map((h) => toLower(h.merchant)));
  const locationSet = new Set(history.map((h) => toLower(h.location)));
  const methodCount = history.filter(
    (h) => toLower(h.paymentMethod) === txPaymentMethod
  ).length;
  const methodRatio = methodCount / history.length;
  const velocity10Min = history.filter((h) => minutesSince(h.createdAt, nowMs) <= 10).length;
  const velocity60Min = history.filter((h) => minutesSince(h.createdAt, nowMs) <= 60).length;
  const priorFlaggedRatio =
    history.filter((h) => ["review", "blocked"].includes(String(h.status || "").toLowerCase())).length /
    history.length;

  let scoreBoost = 0;
  const reasons = [];

  if (z >= 4 || txAmount >= p99) {
    scoreBoost += 28;
    reasons.push("ML: extreme amount anomaly versus user history");
  } else if (z >= 3 || txAmount >= p95) {
    scoreBoost += 18;
    reasons.push("ML: amount is a strong anomaly versus user history");
  } else if (z >= 2) {
    scoreBoost += 12;
    reasons.push("ML: amount is higher than typical user pattern");
  }

  if (txMerchant && !merchantSet.has(txMerchant)) {
    scoreBoost += 8;
    reasons.push("ML: unseen merchant for this user");
  }

  if (txLocation && !locationSet.has(txLocation)) {
    scoreBoost += 8;
    reasons.push("ML: unseen location for this user");
  }

  if (txPaymentMethod && methodRatio < 0.15) {
    scoreBoost += 6;
    reasons.push("ML: uncommon payment method for this user");
  }

  if (velocity10Min >= 3) {
    scoreBoost += 16;
    reasons.push("ML: burst activity detected in last 10 minutes");
  } else if (velocity60Min >= 6) {
    scoreBoost += 10;
    reasons.push("ML: unusually high transaction frequency in last 60 minutes");
  }

  if (priorFlaggedRatio >= 0.4 && history.length >= 10) {
    scoreBoost += 10;
    reasons.push("ML: elevated risk based on recent flagged behavior");
  }

  if (
    txMerchant &&
    txLocation &&
    !history.some((h) => toLower(h.merchant) === txMerchant && toLower(h.location) === txLocation)
  ) {
    scoreBoost += 7;
    reasons.push("ML: unseen merchant-location combination");
  }

  const confidenceScore = clamp(history.length / 30, 0.2, 1);
  const confidence = confidenceScore >= 0.75 ? "high" : confidenceScore >= 0.45 ? "medium" : "low";

  // Downscale aggressive boosts when history is shallow.
  scoreBoost = Math.round(scoreBoost * (0.65 + 0.35 * confidenceScore));
  scoreBoost = clamp(scoreBoost, 0, 55);

  return {
    scoreBoost,
    confidence,
    confidenceScore: Number(confidenceScore.toFixed(2)),
    reasons,
    features: {
      historySize: history.length,
      amountZScore: Number(z.toFixed(2)),
      velocity10Min,
      velocity60Min,
      unseenMerchant: Boolean(txMerchant && !merchantSet.has(txMerchant)),
      unseenLocation: Boolean(txLocation && !locationSet.has(txLocation)),
      rarePaymentMethod: Boolean(txPaymentMethod && methodRatio < 0.15),
      priorFlaggedRatio: Number(priorFlaggedRatio.toFixed(2))
    }
  };
};

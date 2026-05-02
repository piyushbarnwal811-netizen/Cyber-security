const parseSignature = (value) =>
  String(value || "")
    .split(",")
    .map((n) => Number.parseInt(n, 10))
    .filter((n) => Number.isInteger(n) && (n === 0 || n === 1));

export const isValidFaceSignature = (value) => parseSignature(value).length === 64;

export const faceSignatureDistance = (a, b) => {
  const left = parseSignature(a);
  const right = parseSignature(b);
  if (left.length !== 64 || right.length !== 64) return Number.POSITIVE_INFINITY;

  let distance = 0;
  for (let i = 0; i < 64; i += 1) {
    if (left[i] !== right[i]) distance += 1;
  }
  return distance;
};


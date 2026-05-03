import crypto from "crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

const base32Encode = (buffer) => {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
};

const base32Decode = (input) => {
  const clean = String(input || "").replace(/=+$/g, "").toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
};

export const generateTotpSecret = () => base32Encode(crypto.randomBytes(20));

const hotp = (secretBase32, counter) => {
  const key = base32Decode(secretBase32);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter), 0);
  const hmac = crypto.createHmac("sha1", key).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 1000000).padStart(6, "0");
};

export const verifyTotp = ({
  token,
  secret,
  period = 20,
  window = 1,
  now = Date.now()
}) => {
  const cleanToken = String(token || "").replace(/\D/g, "").slice(0, 6);
  if (!cleanToken || !secret) return false;
  const counter = Math.floor(now / 1000 / period);
  for (let i = -window; i <= window; i += 1) {
    if (hotp(secret, counter + i) === cleanToken) return true;
  }
  return false;
};

export const verifyTotpAcrossPeriods = ({
  token,
  secret,
  periods = [30],
  window = 1,
  now = Date.now()
}) => {
  const uniquePeriods = [...new Set((periods || []).map((p) => Number(p)).filter((p) => p > 0))];
  if (!uniquePeriods.length) return false;
  return uniquePeriods.some((period) => verifyTotp({ token, secret, period, window, now }));
};

export const buildOtpAuthUrl = ({ issuer, email, secret, period = 20 }) =>
  `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${encodeURIComponent(
    secret
  )}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=${period}`;

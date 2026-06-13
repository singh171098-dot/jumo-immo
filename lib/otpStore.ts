/**
 * In-memory OTP store for the estimation lead-capture flow.
 * Single-process only — sufficient for the current dev/demo deployment.
 */

interface OtpEntry {
  code: string;
  expiresAt: number;
  attempts: number;
}

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const store = new Map<string, OtpEntry>();

/** Generates a new 6-digit code, stores it for `email`, and returns it. */
export function generateOtp(email: string): string {
  const code = String(Math.floor(100_000 + Math.random() * 900_000));
  store.set(email.toLowerCase(), { code, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 });
  return code;
}

export type OtpVerifyStatus = "ok" | "expired" | "wrong_code" | "too_many_attempts" | "not_found";

export function verifyOtp(email: string, code: string): OtpVerifyStatus {
  const key = email.toLowerCase();
  const entry = store.get(key);
  if (!entry) return "not_found";

  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return "expired";
  }

  if (entry.code !== code) {
    entry.attempts += 1;
    if (entry.attempts >= MAX_ATTEMPTS) {
      store.delete(key);
      return "too_many_attempts";
    }
    return "wrong_code";
  }

  store.delete(key);
  return "ok";
}

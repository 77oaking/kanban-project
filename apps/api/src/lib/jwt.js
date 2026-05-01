import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_TTL = process.env.JWT_ACCESS_TTL || '15m';
const REFRESH_TTL = process.env.JWT_REFRESH_TTL || '7d';

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  // We don't crash on import (so prisma generate / build can run without env),
  // but any sign/verify call will throw a clear error.
  console.warn('[jwt] JWT_ACCESS_SECRET / JWT_REFRESH_SECRET not set');
}

// Each token gets a random `jti` (JWT ID) so two tokens issued in the same
// second with the same payload are still distinct. Without this, jwt.sign's
// `iat` (in seconds) collisions produce identical JWTs — which breaks
// refresh-token rotation: the new refresh token equals the old one, so
// revoking it revokes the new token too, AND the unique constraint on
// RefreshToken.tokenHash would reject the rotation insert in production.
const newJti = () => crypto.randomBytes(12).toString('hex');

export function signAccessToken(payload) {
  return jwt.sign({ ...payload, jti: newJti() }, ACCESS_SECRET, { expiresIn: ACCESS_TTL });
}

export function signRefreshToken(payload) {
  return jwt.sign({ ...payload, jti: newJti() }, REFRESH_SECRET, { expiresIn: REFRESH_TTL });
}

export function verifyAccess(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

export function verifyRefresh(token) {
  return jwt.verify(token, REFRESH_SECRET);
}

// Expressed in ms, useful for cookie maxAge.
export const REFRESH_TTL_MS = (() => {
  const m = /^(\d+)([smhd])$/.exec(REFRESH_TTL);
  if (!m) return 7 * 24 * 60 * 60 * 1000;
  const n = Number(m[1]);
  return n * { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[m[2]];
})();

export const ACCESS_TTL_MS = (() => {
  const m = /^(\d+)([smhd])$/.exec(ACCESS_TTL);
  if (!m) return 15 * 60 * 1000;
  const n = Number(m[1]);
  return n * { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[m[2]];
})();

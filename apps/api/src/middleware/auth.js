import { verifyAccess } from '../lib/jwt.js';
import { HttpError } from './error.js';

/**
 * Reads the access token from the httpOnly `access_token` cookie and attaches
 * `req.user = { id, email }` if valid. Anything else → 401.
 */
export function requireAuth(req, _res, next) {
  const token = req.cookies?.access_token;
  if (!token) return next(new HttpError(401, 'Not authenticated'));
  try {
    const payload = verifyAccess(token);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    return next(new HttpError(401, 'Invalid or expired token'));
  }
}

/** Soft-auth — populates req.user when present, never errors. */
export function attachUserIfAny(req, _res, next) {
  const token = req.cookies?.access_token;
  if (!token) return next();
  try {
    const payload = verifyAccess(token);
    req.user = { id: payload.sub, email: payload.email };
  } catch {
    /* ignore */
  }
  next();
}

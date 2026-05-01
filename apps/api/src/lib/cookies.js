import { ACCESS_TTL_MS, REFRESH_TTL_MS } from './jwt.js';

const isProd = process.env.NODE_ENV === 'production';

export const cookieBase = {
  httpOnly: true,
  // Cross-site cookies (Railway frontend on .up.railway.app, API on a different
  // .up.railway.app subdomain) require SameSite=None; Secure.
  sameSite: isProd ? 'none' : 'lax',
  secure: isProd,
  path: '/',
};

export function setAuthCookies(res, { accessToken, refreshToken }) {
  res.cookie('access_token', accessToken, { ...cookieBase, maxAge: ACCESS_TTL_MS });
  res.cookie('refresh_token', refreshToken, { ...cookieBase, maxAge: REFRESH_TTL_MS });
}

export function clearAuthCookies(res) {
  res.clearCookie('access_token', cookieBase);
  res.clearCookie('refresh_token', cookieBase);
}

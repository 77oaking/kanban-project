/**
 * Integration test for the auth flow. We mock the Prisma client with
 * `jest.unstable_mockModule` so this runs without a Postgres connection —
 * great for CI and local sanity checks.
 *
 * Coverage:
 *   - POST /api/auth/register creates a user, hashes the password, sets cookies
 *   - POST /api/auth/login rejects bad creds, accepts good ones
 *   - GET  /api/auth/me requires the access cookie
 *   - POST /api/auth/refresh rotates the token
 */
import { jest } from '@jest/globals';
import bcrypt from 'bcryptjs';

process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.NODE_ENV = 'test';
process.env.CLIENT_URL = 'http://localhost:3000';

// In-memory fake DB
const db = {
  users: new Map(), // email -> user
  refreshTokens: new Map(), // tokenHash -> token
};

// Mock the prisma module BEFORE the app module is imported.
jest.unstable_mockModule('../src/lib/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(async ({ where }) => {
        if (where.email) return db.users.get(where.email) || null;
        if (where.id) return [...db.users.values()].find((u) => u.id === where.id) || null;
        return null;
      }),
      create: jest.fn(async ({ data }) => {
        const user = { id: `u_${Date.now()}_${Math.random()}`, ...data, createdAt: new Date() };
        db.users.set(user.email, user);
        return user;
      }),
      update: jest.fn(async ({ where, data }) => {
        const u = [...db.users.values()].find((u) => u.id === where.id);
        Object.assign(u, data);
        return u;
      }),
    },
    refreshToken: {
      create: jest.fn(async ({ data }) => {
        const t = { id: `t_${Date.now()}_${Math.random()}`, ...data, createdAt: new Date() };
        db.refreshTokens.set(t.tokenHash, t);
        return t;
      }),
      findUnique: jest.fn(async ({ where }) => db.refreshTokens.get(where.tokenHash) || null),
      update: jest.fn(async ({ where, data }) => {
        const existing = db.refreshTokens.get(where.tokenHash) ||
          [...db.refreshTokens.values()].find((t) => t.id === where.id);
        Object.assign(existing, data);
        return existing;
      }),
    },
  },
}));

// Now we can import the app
const { app } = await import('../src/app.js');
const request = (await import('supertest')).default;

beforeEach(() => {
  db.users.clear();
  db.refreshTokens.clear();
});

describe('POST /api/auth/register', () => {
  test('creates a user, returns 201, sets auth cookies', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'alice@test.com', password: 'Password1!', name: 'Alice' });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('alice@test.com');
    expect(res.body.user).not.toHaveProperty('passwordHash');
    expect(res.headers['set-cookie']).toBeDefined();
    const cookies = res.headers['set-cookie'].join(';');
    expect(cookies).toMatch(/access_token=/);
    expect(cookies).toMatch(/refresh_token=/);
    expect(cookies).toMatch(/HttpOnly/i);
  });

  test('rejects short passwords', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'bob@test.com', password: 'short', name: 'Bob' });
    expect(res.status).toBe(400);
  });

  test('rejects duplicate email', async () => {
    db.users.set('dup@test.com', {
      id: 'u1',
      email: 'dup@test.com',
      passwordHash: await bcrypt.hash('Password1!', 8),
      name: 'Dup',
    });
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'dup@test.com', password: 'Password1!', name: 'Dup' });
    expect(res.status).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    db.users.set('login@test.com', {
      id: 'u_login',
      email: 'login@test.com',
      passwordHash: await bcrypt.hash('Password1!', 8),
      name: 'Logan',
    });
  });

  test('accepts valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@test.com', password: 'Password1!' });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('login@test.com');
  });

  test('rejects wrong password with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@test.com', password: 'WrongPass1!' });
    expect(res.status).toBe(401);
  });

  test('rejects unknown email with 401 (no user enumeration)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'Password1!' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  test('returns 401 without cookie', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('returns the user when access_token is valid', async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ email: 'me@test.com', password: 'Password1!', name: 'Me' });
    const cookie = reg.headers['set-cookie'];
    const res = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('me@test.com');
  });
});

describe('POST /api/auth/refresh', () => {
  test('issues a new pair of cookies (rotation)', async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ email: 'rot@test.com', password: 'Password1!', name: 'Rot' });
    const oldCookies = reg.headers['set-cookie'];

    const res = await request(app).post('/api/auth/refresh').set('Cookie', oldCookies);
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie']).toBeDefined();

    // Pull the refresh_token value out of each cookie array and confirm the
    // new one is different — that's what rotation means in practice.
    const grab = (cookies) => {
      const found = cookies.find((c) => c.startsWith('refresh_token='));
      return found ? found.split(';')[0] : null;
    };
    const oldRefresh = grab(oldCookies);
    const newRefresh = grab(res.headers['set-cookie']);
    expect(oldRefresh).toBeTruthy();
    expect(newRefresh).toBeTruthy();
    expect(newRefresh).not.toBe(oldRefresh);
  });

  test('rejects when no refresh cookie is sent', async () => {
    const res = await request(app).post('/api/auth/refresh');
    expect(res.status).toBe(401);
  });
});

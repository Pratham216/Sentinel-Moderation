import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { healthRouter } from './health.js';

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue(1),
  },
}));

describe('health routes', () => {
  it('GET /healthz returns ok', async () => {
    const app = express();
    app.use(healthRouter);
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

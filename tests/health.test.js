import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('Health Endpoints Test Suite', () => {
  const app = createApp();

  test('GET /health returns 200 with system diagnostics', async () => {
    const res = await request(app).get('/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'healthy');
    assert.equal(res.body.service, 'library-management-system');
    assert.ok(res.body.timestamp);
    assert.ok(typeof res.body.uptimeSeconds === 'number');
    assert.ok(res.body.memory);
  });

  test('GET /health/ready returns 200 ready probe', async () => {
    const res = await request(app).get('/health/ready');
    assert.equal(res.status, 200);
    assert.equal(res.body.ready, true);
  });

  test('GET /health/live returns 200 liveness probe', async () => {
    const res = await request(app).get('/health/live');
    assert.equal(res.status, 200);
    assert.equal(res.body.live, true);
  });
});

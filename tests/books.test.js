import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { bookService } from '../src/services/bookService.js';

describe('Library Books API Endpoints Test Suite', () => {
  const app = createApp();

  beforeEach(() => {
    // Reset catalog before each test to maintain deterministic state
    bookService.resetToDefaults();
  });

  test('GET /api/books returns book list with success', async () => {
    const res = await request(app).get('/api/books');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.count >= 1);
  });

  test('GET /api/books/stats returns catalog metrics', async () => {
    const res = await request(app).get('/api/books/stats');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.totalTitles > 0);
    assert.ok(res.body.data.totalCopies >= res.body.data.availableCopies);
  });

  test('POST /api/books creates a new book item', async () => {
    const payload = {
      title: 'Kubernetes Up & Running',
      author: 'Brendan Burns, Joe Beda, Kelsey Hightower',
      isbn: '978-1492046530',
      genre: 'Cloud & Containers',
      publishedYear: 2022,
      totalCopies: 4,
      description: 'Dive into the world of Kubernetes container orchestration.'
    };

    const res = await request(app)
      .post('/api/books')
      .send(payload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.title, payload.title);
    assert.equal(res.body.data.availableCopies, 4);
    assert.ok(res.body.data.id);
  });

  test('POST /api/books rejects request without required title/author', async () => {
    const res = await request(app)
      .post('/api/books')
      .send({ description: 'Book missing title' });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  test('GET /api/books/:id returns specific book and 404 for invalid ID', async () => {
    const existing = bookService.getAllBooks()[0];
    const res = await request(app).get(`/api/books/${existing.id}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.id, existing.id);

    const notFoundRes = await request(app).get('/api/books/nonexistent-id');
    assert.equal(notFoundRes.status, 404);
  });

  test('POST /api/books/:id/borrow and return workflow', async () => {
    const book = bookService.getAllBooks()[0];
    const initialAvailable = book.availableCopies;

    // Borrow
    const borrowRes = await request(app).post(`/api/books/${book.id}/borrow`);
    assert.equal(borrowRes.status, 200);
    assert.equal(borrowRes.body.success, true);
    assert.equal(borrowRes.body.book.availableCopies, initialAvailable - 1);

    // Return
    const returnRes = await request(app).post(`/api/books/${book.id}/return`);
    assert.equal(returnRes.status, 200);
    assert.equal(returnRes.body.success, true);
    assert.equal(returnRes.body.book.availableCopies, initialAvailable);
  });

  test('DELETE /api/books/:id removes a book from the catalog', async () => {
    const book = bookService.getAllBooks()[0];
    const res = await request(app).delete(`/api/books/${book.id}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const verifyRes = await request(app).get(`/api/books/${book.id}`);
    assert.equal(verifyRes.status, 404);
  });
});

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const { addBookmark, getAllBookmarks, removeBookmark } = require('../db');

const B1 = {
  url: 'https://test-add-abc123.example.com',
  title: 'Test Add Article',
  description: 'Test description',
  urlToImage: null,
  publishedAt: '2026-01-01T00:00:00Z',
  source: 'TestSource',
};

const B2 = {
  url: 'https://test-remove-abc123.example.com',
  title: 'Test Remove Article',
  description: 'Test description',
  urlToImage: null,
  publishedAt: '2026-01-01T00:00:00Z',
  source: 'TestSource',
};

// Test 1: add → get → verify present
test('DB: addBookmark stores record and getAllBookmarks returns it', async () => {
  try {
    await addBookmark(B1);

    const all = await getAllBookmarks();
    const found = all.find(b => b.url === B1.url);

    assert.ok(found, 'bookmark should exist in DB after addBookmark');
    assert.equal(found.title, B1.title, 'stored title should match');
    assert.equal(found.source, B1.source, 'stored source should match');
  } finally {
    await removeBookmark(B1.url);
  }
});

// Test 2: add → remove → get → verify gone
test('DB: removeBookmark deletes record so getAllBookmarks no longer returns it', async () => {
  await addBookmark(B2);
  await removeBookmark(B2.url);

  const all = await getAllBookmarks();
  const found = all.find(b => b.url === B2.url);

  assert.equal(found, undefined, 'bookmark should be absent after removeBookmark');
});

// Test 3: spin up express, hit /api/bookmarks, verify 200 + array
test('API: GET /api/bookmarks returns status 200 and a JSON array', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/bookmarks', require('../routes/bookmarks'));

  const server = http.createServer(app);

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/bookmarks`);

    assert.equal(res.status, 200, 'status should be 200');

    const body = await res.json();
    assert.ok(Array.isArray(body), 'response body should be a JSON array');
  } finally {
    await new Promise((resolve, reject) =>
      server.close(err => (err ? reject(err) : resolve()))
    );
  }
});

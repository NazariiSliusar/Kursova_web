const express = require('express');
const { getAllBookmarks, addBookmark, updateBookmark, removeBookmark } = require('../db');

const router = express.Router();

router.get('/', async (req, res) => {
  res.json(await getAllBookmarks());
});

router.post('/', async (req, res) => {
  const { title, description, url, urlToImage, publishedAt, source } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  await addBookmark({ title, description, url, urlToImage, publishedAt, source });
  res.json({ ok: true });
});

// Update notes or is_read for an existing bookmark
router.put('/:url', async (req, res) => {
  const url = decodeURIComponent(req.params.url);
  const { notes, is_read } = req.body;
  await updateBookmark(url, { notes, is_read });
  res.json({ ok: true });
});

router.delete('/:url', async (req, res) => {
  await removeBookmark(decodeURIComponent(req.params.url));
  res.json({ ok: true });
});

module.exports = router;

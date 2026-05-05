const express = require('express');
const { getAllCategories, addCategory, deleteCategory } = require('../db');

const router = express.Router();

router.get('/', async (req, res) => {
  res.json(await getAllCategories());
});

router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
  const row = await addCategory(name.trim());
  res.json(row);
});

router.delete('/:id', async (req, res) => {
  await deleteCategory(Number(req.params.id));
  res.json({ ok: true });
});

module.exports = router;

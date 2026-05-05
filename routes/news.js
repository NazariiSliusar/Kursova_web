const express = require('express');
const fetch = require('node-fetch');
const { addSearchHistory, getSearchHistory, deleteSearchHistoryItem, clearSearchHistory } = require('../db');

const router = express.Router();

const GNEWS_CATEGORY = {
  general: 'general', technology: 'technology', sports: 'sports',
  business: 'business', science: 'science', health: 'health',
};

function normalizeGNews(a) {
  return {
    title: a.title, description: a.description, url: a.url,
    urlToImage: a.image, publishedAt: a.publishedAt,
    source: { name: a.source?.name || '' },
  };
}

router.get('/', async (req, res) => {
  const { category, q, lang = 'en' } = req.query;

  try {
    let articles;

    if (lang === 'uk') {
      let url;
      if (q && q.trim()) {
        url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(q)}&lang=uk&max=30&apikey=${process.env.GNEWS_API_KEY}`;
      } else {
        const topic = GNEWS_CATEGORY[category] || 'general';
        url = `https://gnews.io/api/v4/top-headlines?lang=uk&topic=${topic}&max=30&apikey=${process.env.GNEWS_API_KEY}`;
      }
      const data = await (await fetch(url)).json();
      if (data.errors) return res.status(502).json({ error: data.errors.join(', ') });
      articles = (data.articles || []).map(normalizeGNews);
    } else {
      let url;
      if (q && q.trim()) {
        url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&language=en&sortBy=publishedAt&pageSize=30&apiKey=${process.env.NEWS_API_KEY}`;
      } else {
        const cat = category && category !== 'general' ? `&category=${category}` : '';
        url = `https://newsapi.org/v2/top-headlines?country=us${cat}&pageSize=30&apiKey=${process.env.NEWS_API_KEY}`;
      }
      const data = await (await fetch(url)).json();
      if (data.status !== 'ok') return res.status(502).json({ error: data.message || 'NewsAPI error' });
      articles = data.articles.filter(a => a.title && a.title !== '[Removed]');
    }

    if (q && q.trim()) await addSearchHistory(q.trim());

    res.json({ articles });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

router.get('/search-history', async (req, res) => {
  res.json(await getSearchHistory());
});

router.delete('/search-history', async (req, res) => {
  await clearSearchHistory();
  res.json({ ok: true });
});

router.delete('/search-history/:id', async (req, res) => {
  await deleteSearchHistoryItem(Number(req.params.id));
  res.json({ ok: true });
});

module.exports = router;

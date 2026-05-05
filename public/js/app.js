const newsGrid    = document.getElementById('news-grid');
const statusMsg   = document.getElementById('status-message');
const searchInput = document.getElementById('search-input');
const searchBtn   = document.getElementById('search-btn');
const catButtons  = document.querySelectorAll('.cat-btn');
const themeToggle = document.getElementById('theme-toggle');
const langSelect  = document.getElementById('lang-select');
const customTabsEl = document.getElementById('custom-tabs');
const addCatBtn   = document.getElementById('add-cat-btn');

let currentCategory = 'general';
let currentQuery    = '';
let currentLang     = localStorage.getItem('lang') || 'en';
let bookmarkedUrls  = new Set();

// ── Translations ──────────────────────────────────────────────────────────
const I18N = {
  en: {
    search: 'Search news…', save: 'Save', saved: 'Saved',
    addBookmark: 'Add bookmark', removeBookmark: 'Remove bookmark',
    noArticles: 'No articles found.',
    noBookmarks: 'No bookmarks yet. Save articles to see them here.',
    addCatHint: 'Category name…', notesHint: 'Add a note…',
    markRead: 'Mark as read', markUnread: 'Mark as unread',
    categories: { general: 'General', technology: 'Technology', sports: 'Sports', business: 'Business', science: 'Science', health: 'Health', bookmarks: 'Bookmarks' },
  },
  uk: {
    search: 'Пошук новин…', save: 'Зберегти', saved: 'Збережено',
    addBookmark: 'Додати закладку', removeBookmark: 'Видалити закладку',
    noArticles: 'Статей не знайдено.',
    noBookmarks: 'Закладок ще немає. Збережіть статті, щоб побачити їх тут.',
    addCatHint: 'Назва категорії…', notesHint: 'Додати нотатку…',
    markRead: 'Позначити прочитаним', markUnread: 'Позначити непрочитаним',
    categories: { general: 'Головне', technology: 'Технології', sports: 'Спорт', business: 'Бізнес', science: 'Наука', health: 'Здоров\'я', bookmarks: 'Закладки' },
  },
};
function t(key) { return I18N[currentLang]?.[key] ?? I18N.en[key]; }

function applyLangUI() {
  const tr = I18N[currentLang];
  document.getElementById('search-input').placeholder = tr.search;
  catButtons.forEach(btn => {
    const cat = btn.dataset.category;
    if (tr.categories[cat]) btn.textContent = tr.categories[cat];
  });
}

// ── Theme ─────────────────────────────────────────────────────────────────
(function initTheme() {
  const saved = localStorage.getItem('theme') || 'light';
  document.documentElement.dataset.theme = saved;
  themeToggle.textContent = saved === 'dark' ? '☀️' : '🌙';
})();

themeToggle.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  themeToggle.textContent = next === 'dark' ? '☀️' : '🌙';
  localStorage.setItem('theme', next);
});

// ── Language ──────────────────────────────────────────────────────────────
langSelect.value = currentLang;
applyLangUI();

langSelect.addEventListener('change', () => {
  currentLang = langSelect.value;
  localStorage.setItem('lang', currentLang);
  applyLangUI();
  if (currentCategory === 'bookmarks') { showBookmarks(); return; }
  if (currentQuery) fetchNews(null, currentQuery);
  else fetchNews(currentCategory, '');
});

// ── Bookmarks ─────────────────────────────────────────────────────────────
async function fetchBookmarks() {
  const data = await (await fetch('/api/bookmarks')).json();
  bookmarkedUrls = new Set(data.map(b => b.url));
}

// ── News ──────────────────────────────────────────────────────────────────
async function fetchNews(category, query) {
  showSkeletons();
  let url = `/api/news?lang=${currentLang}&`;
  if (query) url += `q=${encodeURIComponent(query)}`;
  else url += `category=${encodeURIComponent(category)}`;

  const data = await (await fetch(url)).json();
  if (data.error) { showError(data.error); return; }
  renderArticles(data.articles);
}

function showSkeletons() {
  hideStatus();
  newsGrid.innerHTML = Array.from({ length: 9 }, () => `
    <div class="skeleton-card" role="listitem">
      <div class="skeleton-img"></div>
      <div class="skeleton-body">
        <div class="skeleton-line short"></div>
        <div class="skeleton-line medium"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line medium"></div>
      </div>
    </div>`).join('');
}

function renderArticles(articles) {
  newsGrid.innerHTML = '';
  if (!articles || articles.length === 0) { showStatus(t('noArticles')); return; }
  hideStatus();
  articles.forEach(a => newsGrid.appendChild(createCard(a)));
}

// ── Date formatting via date-fns ──────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return '';
  try {
    return dateFns.format(new Date(iso), 'MMM d, yyyy');
  } catch (_) { return iso; }
}

// ── Card ──────────────────────────────────────────────────────────────────
function createCard(article, bookmarkData = null) {
  const { title, description, url, urlToImage, publishedAt, source } = article;
  const sourceName = source?.name || 'Unknown';
  const saved = bookmarkedUrls.has(url);

  const el = document.createElement('article');
  el.className = 'card' + (bookmarkData?.is_read ? ' is-read' : '');
  el.setAttribute('role', 'listitem');
  el.dataset.url = url;

  el.innerHTML = `
    ${urlToImage
      ? `<img class="card-image" src="${escHtml(urlToImage)}" alt="${escHtml(title)}" loading="lazy" onerror="this.replaceWith(makePlaceholder())">`
      : `<div class="card-image-placeholder">📰</div>`}
    <div class="card-body">
      <div class="card-meta">
        <span class="card-source">${escHtml(sourceName)}</span>
        <span class="card-date">${escHtml(formatDate(publishedAt))}</span>
        ${bookmarkData?.is_read ? `<span class="read-badge">${currentLang === 'uk' ? '✓ Переглянуто' : '✓ Read'}</span>` : ''}
      </div>
      <h2 class="card-title"><a href="${escHtml(url)}" target="_blank" rel="noopener noreferrer">${escHtml(title)}</a></h2>
      ${description ? `<p class="card-desc">${escHtml(description)}</p>` : ''}
      ${bookmarkData !== null ? `
        <textarea class="card-notes" placeholder="${t('notesHint')}" aria-label="Notes">${escHtml(bookmarkData.notes || '')}</textarea>
      ` : ''}
    </div>
    <div class="card-footer">
      ${bookmarkData !== null ? `
        <button class="read-btn ${bookmarkData.is_read ? 'is-read' : ''}" data-read="${bookmarkData.is_read ? '1' : '0'}">
          ${bookmarkData.is_read ? t('markUnread') : t('markRead')}
        </button>
      ` : ''}
      <button class="bookmark-btn ${saved ? 'saved' : ''}" aria-label="${saved ? t('removeBookmark') : t('addBookmark')}">
        <svg viewBox="0 0 24 24"><path class="bm-icon" d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
        ${saved ? t('saved') : t('save')}
      </button>
    </div>`;

  el.querySelector('.bookmark-btn').addEventListener('click', () => toggleBookmark(article, el));

  if (bookmarkData !== null) {
    const textarea = el.querySelector('.card-notes');
    textarea.addEventListener('blur', () => {
      fetch(`/api/bookmarks/${encodeURIComponent(url)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: textarea.value }),
      });
    });

    const readBtn = el.querySelector('.read-btn');
    readBtn.addEventListener('click', () => {
      const nowRead = readBtn.dataset.read === '0' ? 1 : 0;
      readBtn.dataset.read = String(nowRead);
      readBtn.textContent = nowRead ? t('markUnread') : t('markRead');
      readBtn.classList.toggle('is-read', !!nowRead);
      el.classList.toggle('is-read', !!nowRead);
      fetch(`/api/bookmarks/${encodeURIComponent(url)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_read: nowRead }),
      });
    });
  }

  return el;
}

function makePlaceholder() {
  const div = document.createElement('div');
  div.className = 'card-image-placeholder';
  div.textContent = '📰';
  return div;
}

async function toggleBookmark(article, cardEl) {
  const btn = cardEl.querySelector('.bookmark-btn');
  const url = article.url;

  if (bookmarkedUrls.has(url)) {
    await fetch(`/api/bookmarks/${encodeURIComponent(url)}`, { method: 'DELETE' });
    bookmarkedUrls.delete(url);
    btn.classList.remove('saved');
    btn.setAttribute('aria-label', t('addBookmark'));
    btn.innerHTML = `<svg viewBox="0 0 24 24"><path class="bm-icon" d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>${t('save')}`;
    if (currentCategory === 'bookmarks') cardEl.remove();
  } else {
    await fetch('/api/bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: article.title, description: article.description, url: article.url,
        urlToImage: article.urlToImage, publishedAt: article.publishedAt,
        source: article.source?.name || '',
      }),
    });
    bookmarkedUrls.add(url);
    btn.classList.add('saved');
    btn.setAttribute('aria-label', t('removeBookmark'));
    btn.innerHTML = `<svg viewBox="0 0 24 24"><path class="bm-icon" d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>${t('saved')}`;
  }
}

async function showBookmarks() {
  showSkeletons();
  const data = await (await fetch('/api/bookmarks')).json();
  newsGrid.innerHTML = '';
  if (!data.length) { showStatus(t('noBookmarks')); return; }
  hideStatus();
  data.forEach(b => {
    const article = {
      title: b.title, description: b.description, url: b.url,
      urlToImage: b.urlToImage, publishedAt: b.publishedAt,
      source: { name: b.source },
    };
    newsGrid.appendChild(createCard(article, b));
  });
}

// ── Custom categories (persisted in DB) ───────────────────────────────────
function deactivateAll() {
  catButtons.forEach(b => b.classList.remove('active'));
  customTabsEl.querySelectorAll('.custom-cat-btn').forEach(b => b.classList.remove('active'));
}

function addCustomTab(cat) {
  const wrap = document.createElement('div');
  wrap.className = 'custom-cat-btn';
  wrap.dataset.id = cat.id;
  wrap.innerHTML = `<span class="cat-label">${escHtml(cat.name)}</span><button class="del-btn" aria-label="Remove ${escHtml(cat.name)}">✕</button>`;

  wrap.addEventListener('click', e => {
    if (e.target.classList.contains('del-btn')) return;
    deactivateAll();
    wrap.classList.add('active');
    currentQuery = cat.name;
    searchInput.value = '';
    fetchNews(null, cat.name);
  });

  wrap.querySelector('.del-btn').addEventListener('click', async e => {
    e.stopPropagation();
    await fetch(`/api/categories/${cat.id}`, { method: 'DELETE' });
    if (wrap.classList.contains('active')) {
      catButtons[0].classList.add('active');
      currentCategory = 'general';
      fetchNews('general', '');
    }
    wrap.remove();
  });

  customTabsEl.appendChild(wrap);
}

function openNewCatInput() {
  if (customTabsEl.querySelector('.cat-input-wrap')) return;
  const wrap = document.createElement('div');
  wrap.className = 'cat-input-wrap';
  wrap.innerHTML = `<input type="text" placeholder="${t('addCatHint')}" maxlength="30" />`;
  const input = wrap.querySelector('input');

  async function confirm() {
    const name = input.value.trim();
    wrap.remove();
    if (!name) return;
    const cat = await (await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })).json();
    if (cat.id) addCustomTab(cat);
  }

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') confirm();
    if (e.key === 'Escape') wrap.remove();
  });
  input.addEventListener('blur', confirm);
  customTabsEl.appendChild(wrap);
  input.focus();
}

addCatBtn.addEventListener('click', openNewCatInput);

// ── Helpers ───────────────────────────────────────────────────────────────
function showStatus(msg, isError = false) {
  statusMsg.textContent = msg;
  statusMsg.className = 'status-message' + (isError ? ' error' : '');
  statusMsg.hidden = false;
}
function showError(msg) { showStatus(msg, true); newsGrid.innerHTML = ''; }
function hideStatus() { statusMsg.hidden = true; }

function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

catButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    deactivateAll();
    btn.classList.add('active');
    currentQuery = '';
    searchInput.value = '';
    currentCategory = btn.dataset.category;
    if (currentCategory === 'bookmarks') showBookmarks();
    else fetchNews(currentCategory, '');
  });
});

function triggerSearch() {
  const q = searchInput.value.trim();
  if (!q) return;
  currentQuery = q;
  deactivateAll();
  fetchNews(null, q);
}
searchBtn.addEventListener('click', triggerSearch);
searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') triggerSearch(); });

// ── Search history dropdown ───────────────────────────────────────────────
const historyDropdown = document.getElementById('search-history-dropdown');

async function loadHistoryDropdown() {
  const items = await (await fetch('/api/news/search-history')).json();
  if (!items.length) { historyDropdown.hidden = true; return; }

  historyDropdown.innerHTML = `
    <div class="search-history-header">
      <span>${currentLang === 'uk' ? 'Історія пошуку' : 'Recent searches'}</span>
      <button class="search-history-clear" id="clear-history-btn">
        ${currentLang === 'uk' ? 'Очистити' : 'Clear all'}
      </button>
    </div>
    ${items.map(item => `
      <div class="search-history-item" data-id="${item.id}" data-query="${escHtml(item.query)}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <span>${escHtml(item.query)}</span>
        <button class="item-del" data-id="${item.id}" aria-label="Remove">✕</button>
      </div>`).join('')}
  `;
  historyDropdown.hidden = false;

  historyDropdown.querySelector('#clear-history-btn').addEventListener('click', async e => {
    e.stopPropagation();
    await fetch('/api/news/search-history', { method: 'DELETE' });
    historyDropdown.hidden = true;
  });

  historyDropdown.querySelectorAll('.search-history-item').forEach(row => {
    row.addEventListener('click', e => {
      if (e.target.classList.contains('item-del')) return;
      searchInput.value = row.dataset.query;
      historyDropdown.hidden = true;
      triggerSearch();
    });
    row.querySelector('.item-del').addEventListener('click', async e => {
      e.stopPropagation();
      await fetch(`/api/news/search-history/${row.dataset.id}`, { method: 'DELETE' });
      row.remove();
      if (!historyDropdown.querySelectorAll('.search-history-item').length) {
        historyDropdown.hidden = true;
      }
    });
  });
}

searchInput.addEventListener('focus', loadHistoryDropdown);

document.addEventListener('click', e => {
  if (!document.getElementById('search-wrap').contains(e.target)) {
    historyDropdown.hidden = true;
  }
});

// ── Init ──────────────────────────────────────────────────────────────────
(async function init() {
  await fetchBookmarks();
  const cats = await (await fetch('/api/categories')).json();
  cats.forEach(addCustomTab);
  fetchNews(currentCategory, '');
})();

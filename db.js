const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'bookmarks.db');

let db;

async function getDb() {
  if (db) return db;

  const SQL = await initSqlJs();
  db = fs.existsSync(DB_PATH)
    ? new SQL.Database(fs.readFileSync(DB_PATH))
    : new SQL.Database();

  db.run(`
    CREATE TABLE IF NOT EXISTS bookmarks (
      url         TEXT PRIMARY KEY,
      title       TEXT,
      description TEXT,
      urlToImage  TEXT,
      publishedAt TEXT,
      source      TEXT,
      notes       TEXT    DEFAULT '',
      is_read     INTEGER DEFAULT 0
    )
  `);

  // Migration: add columns to existing DBs that predate this schema
  try { db.run("ALTER TABLE bookmarks ADD COLUMN notes TEXT DEFAULT ''"); } catch (_) {}
  try { db.run('ALTER TABLE bookmarks ADD COLUMN is_read INTEGER DEFAULT 0'); } catch (_) {}

  // Stores user-defined category tabs (moved from localStorage to DB)
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Keeps the last 50 searches for history/analytics
  db.run(`
    CREATE TABLE IF NOT EXISTS search_history (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      query       TEXT NOT NULL,
      searched_at TEXT DEFAULT (datetime('now'))
    )
  `);

  return db;
}

function persist() {
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

// ── Bookmarks ──────────────────────────────────────────────────────────────
async function getAllBookmarks() {
  const d = await getDb();
  const stmt = d.prepare('SELECT * FROM bookmarks ORDER BY publishedAt DESC');
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

async function addBookmark(article) {
  const d = await getDb();
  d.run(
    `INSERT OR IGNORE INTO bookmarks (url, title, description, urlToImage, publishedAt, source)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [article.url, article.title, article.description, article.urlToImage, article.publishedAt, article.source]
  );
  persist();
}

async function updateBookmark(url, fields) {
  const d = await getDb();
  // Only allow updating safe fields — notes and is_read
  const allowed = ['notes', 'is_read'];
  const keys = Object.keys(fields).filter(k => allowed.includes(k));
  if (!keys.length) return;
  const set = keys.map(k => `${k} = ?`).join(', ');
  d.run(`UPDATE bookmarks SET ${set} WHERE url = ?`, [...keys.map(k => fields[k]), url]);
  persist();
}

async function removeBookmark(url) {
  const d = await getDb();
  d.run('DELETE FROM bookmarks WHERE url = ?', [url]);
  persist();
}

// ── Categories ─────────────────────────────────────────────────────────────
async function getAllCategories() {
  const d = await getDb();
  const stmt = d.prepare('SELECT * FROM categories ORDER BY id ASC');
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

async function addCategory(name) {
  const d = await getDb();
  d.run('INSERT OR IGNORE INTO categories (name) VALUES (?)', [name]);
  persist();
  const stmt = d.prepare('SELECT * FROM categories WHERE name = ?');
  stmt.bind([name]);
  stmt.step();
  const row = stmt.getAsObject();
  stmt.free();
  return row;
}

async function deleteCategory(id) {
  const d = await getDb();
  d.run('DELETE FROM categories WHERE id = ?', [id]);
  persist();
}

// ── Search history ─────────────────────────────────────────────────────────
async function addSearchHistory(query) {
  const d = await getDb();
  d.run('INSERT INTO search_history (query) VALUES (?)', [query]);
  // Keep only the last 50 entries
  d.run(`DELETE FROM search_history WHERE id NOT IN
    (SELECT id FROM search_history ORDER BY id DESC LIMIT 50)`);
  persist();
}

async function getSearchHistory() {
  const d = await getDb();
  const stmt = d.prepare('SELECT * FROM search_history ORDER BY id DESC LIMIT 20');
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

async function deleteSearchHistoryItem(id) {
  const d = await getDb();
  d.run('DELETE FROM search_history WHERE id = ?', [id]);
  persist();
}

async function clearSearchHistory() {
  const d = await getDb();
  d.run('DELETE FROM search_history');
  persist();
}

module.exports = {
  getAllBookmarks, addBookmark, updateBookmark, removeBookmark,
  getAllCategories, addCategory, deleteCategory,
  addSearchHistory, getSearchHistory, deleteSearchHistoryItem, clearSearchHistory,
};

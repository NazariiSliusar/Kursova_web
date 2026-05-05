# NewsHub

A news web application built with Node.js + Express and vanilla HTML/CSS/JS, powered by [NewsAPI](https://newsapi.org).

## Features

- Browse top headlines by category (General, Technology, Sports, Business, Science, Health)
- Search articles by keyword
- Bookmark articles — saved persistently in a local SQLite database

## Setup

### 1. Get a NewsAPI key

1. Go to [https://newsapi.org/register](https://newsapi.org/register) and create a free account.
2. Copy your API key from the dashboard.

### 2. Configure environment

Open `.env` and replace the placeholder with your key:

```
NEWS_API_KEY=your_actual_api_key_here
PORT=3000
```

### 3. Install dependencies

```bash
npm install
```

### 4. Start the server

```bash
node server.js
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Notes

- The free NewsAPI tier only allows requests from localhost / server-side — this app proxies all NewsAPI calls through the Express backend so your key stays secure.
- Bookmarks are stored in `bookmarks.db` (SQLite), created automatically on first run.

require('dotenv').config();
const express = require('express');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

app.use('/api/news',        require('./routes/news'));
app.use('/api/bookmarks',   require('./routes/bookmarks'));
app.use('/api/categories',  require('./routes/categories'));

const server = app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\nPort ${PORT} is already in use.`);
    console.error(`Run this in PowerShell to free it:`);
    console.error(`  Stop-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess -Force\n`);
  } else {
    console.error(err);
  }
  process.exit(1);
});

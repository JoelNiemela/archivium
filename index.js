const express = require('express');
const db = require('./database');
const path = require('path');
const bodyParser = require('body-parser');
const favicon = require('serve-favicon');
const pug = require('pug');

const PORT = 3004;
const ADDR_PREFIX = '/archivium';

const app = express();
app.use(bodyParser.json());

// compile templates
const errorTemplate = pug.compileFile('templates/error.pug');
const homeTemplate = pug.compileFile('templates/home.pug');

app.use(favicon(path.join(__dirname, 'assets/favicon.ico')));
app.use(`${ADDR_PREFIX}/archive`, express.static(path.join(__dirname, 'archive/')));
app.use(`${ADDR_PREFIX}/assets`, express.static(path.join(__dirname, 'assets/')));

app.get(`${ADDR_PREFIX}/`, (req, res) => {
  const html = homeTemplate();
  res.end(html);
});

// 404 errors
app.use((req, res) => {
  res.status(404);
  res.end(errorTemplate({ code: 404 }));
});

app.listen(PORT, () => {
  console.log(`Example app listening at http://localhost:${PORT}`);
});

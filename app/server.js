'use strict';
/**
 * Website chia se cong thuc nau an
 * Stack: Node.js (Express) + MySQL, xuat metrics Prometheus, log JSON ra stdout.
 */
const path = require('path');
const express = require('express');
const mysql = require('mysql2/promise');
const client = require('prom-client');

const PORT = parseInt(process.env.PORT || '3000', 10);

// ---------------------------------------------------------------- Database
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'db',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'recipe_app',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'recipes_db',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
});

// ---------------------------------------------------------------- Metrics
client.collectDefaultMetrics();
const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Thoi gian xu ly request HTTP',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
});
const httpTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Tong so request HTTP',
  labelNames: ['method', 'route', 'status'],
});

// ---------------------------------------------------------------- App
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.urlencoded({ extended: false, limit: '32kb' }));
app.use('/static', express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

// Middleware: do thoi gian + ghi log JSON (de Loki/LogQL parse bang `| json`)
app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const sec = Number(process.hrtime.bigint() - start) / 1e9;
    const route = req.route ? req.route.path : 'unmatched';
    const labels = { method: req.method, route, status: String(res.statusCode) };
    httpDuration.observe(labels, sec);
    httpTotal.inc(labels);
    if (req.path !== '/healthz' && req.path !== '/metrics') {
      console.log(JSON.stringify({
        level: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
        msg: 'http_request',
        method: req.method,
        path: req.path,
        status: res.statusCode,
        ms: Math.round(sec * 1000),
      }));
    }
  });
  next();
});

// Chong XSS: escape moi du lieu nguoi dung truoc khi dua vao HTML
const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function layout(title, body) {
  return `<!doctype html>
<html lang="vi"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} - Bep Viet</title>
<link rel="stylesheet" href="/static/style.css">
</head><body>
<header><div class="wrap">
  <a class="brand" href="/">🍲 Bếp Việt</a>
  <nav><a href="/">Công thức</a><a href="/new">+ Thêm công thức</a></nav>
</div></header>
<main class="wrap">${body}</main>
<footer><div class="wrap">Website chia sẻ công thức nấu ăn - Đề 29 (DevOps)</div></footer>
</body></html>`;
}

async function getCategories() {
  const [rows] = await pool.query('SELECT id, name FROM categories ORDER BY name');
  return rows;
}

// ---------------------------------------------------------------- Routes
app.get('/healthz', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).send('ok');
  } catch (e) {
    res.status(503).send('db unavailable');
  }
});

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

app.get('/', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim().slice(0, 80);
    const cat = parseInt(req.query.cat, 10) || 0;
    const cats = await getCategories();

    let sql = `SELECT r.id, r.title, r.description, c.name AS category
               FROM recipes r JOIN categories c ON c.id = r.category_id WHERE 1=1`;
    const params = [];
    if (q) { sql += ' AND (r.title LIKE ? OR r.description LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
    if (cat) { sql += ' AND r.category_id = ?'; params.push(cat); }
    sql += ' ORDER BY r.created_at DESC, r.id DESC LIMIT 100';
    const [rows] = await pool.query(sql, params);

    const options = cats.map((c) =>
      `<option value="${c.id}"${c.id === cat ? ' selected' : ''}>${esc(c.name)}</option>`).join('');
    const cards = rows.length
      ? rows.map((r) => `<article class="card">
          <span class="tag">${esc(r.category)}</span>
          <h3><a href="/recipe/${r.id}">${esc(r.title)}</a></h3>
          <p>${esc(r.description)}</p></article>`).join('')
      : '<p class="muted">Không tìm thấy công thức nào.</p>';

    res.send(layout('Trang chủ', `
      <h1>Công thức nấu ăn</h1>
      <form class="search" method="get" action="/">
        <input type="text" name="q" value="${esc(q)}" placeholder="Tìm món ăn..." maxlength="80">
        <select name="cat"><option value="0">Tất cả danh mục</option>${options}</select>
        <button type="submit">Tìm</button>
      </form>
      <div class="grid">${cards}</div>`));
  } catch (e) { next(e); }
});

app.get('/recipe/:id(\\d+)', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [recipes] = await pool.query(
      `SELECT r.*, c.name AS category FROM recipes r
       JOIN categories c ON c.id = r.category_id WHERE r.id = ?`, [id]);
    if (!recipes.length) return next();
    const r = recipes[0];
    const [ings] = await pool.query(
      'SELECT name, quantity FROM ingredients WHERE recipe_id = ? ORDER BY id', [id]);

    const ingList = ings.map((i) =>
      `<li><strong>${esc(i.name)}</strong>${i.quantity ? ' — ' + esc(i.quantity) : ''}</li>`).join('');
    const steps = String(r.instructions).split(/\r?\n/).filter(Boolean)
      .map((s) => `<li>${esc(s)}</li>`).join('');

    res.send(layout(r.title, `
      <p><a href="/">← Quay lại</a></p>
      <span class="tag">${esc(r.category)}</span>
      <h1>${esc(r.title)}</h1>
      <p class="lead">${esc(r.description)}</p>
      <div class="cols">
        <section><h2>Nguyên liệu</h2><ul>${ingList}</ul></section>
        <section><h2>Cách làm</h2><ol>${steps}</ol></section>
      </div>`));
  } catch (e) { next(e); }
});

app.get('/new', async (_req, res, next) => {
  try {
    const cats = await getCategories();
    res.send(layout('Thêm công thức', formHtml(cats, {}, [])));
  } catch (e) { next(e); }
});

function formHtml(cats, v, errors) {
  const options = cats.map((c) =>
    `<option value="${c.id}"${String(c.id) === String(v.category_id) ? ' selected' : ''}>${esc(c.name)}</option>`).join('');
  const errs = errors.length ? `<ul class="errors">${errors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>` : '';
  return `<h1>Thêm công thức mới</h1>${errs}
  <form class="stack" method="post" action="/new">
    <label>Tên món <input name="title" value="${esc(v.title)}" maxlength="120" required></label>
    <label>Danh mục <select name="category_id" required>${options}</select></label>
    <label>Mô tả ngắn <input name="description" value="${esc(v.description)}" maxlength="255"></label>
    <label>Nguyên liệu (mỗi dòng: <em>tên | số lượng</em>)
      <textarea name="ingredients" rows="6" required>${esc(v.ingredients)}</textarea></label>
    <label>Cách làm (mỗi dòng một bước)
      <textarea name="instructions" rows="8" required>${esc(v.instructions)}</textarea></label>
    <button type="submit">Lưu công thức</button>
  </form>`;
}

app.post('/new', async (req, res, next) => {
  const conn = await pool.getConnection().catch(next);
  if (!conn) return;
  try {
    const v = {
      title: String(req.body.title || '').trim(),
      category_id: parseInt(req.body.category_id, 10) || 0,
      description: String(req.body.description || '').trim(),
      ingredients: String(req.body.ingredients || '').trim(),
      instructions: String(req.body.instructions || '').trim(),
    };
    const cats = await getCategories();
    const errors = [];
    if (v.title.length < 3 || v.title.length > 120) errors.push('Tên món phải từ 3 đến 120 ký tự.');
    if (!cats.some((c) => c.id === v.category_id)) errors.push('Danh mục không hợp lệ.');
    if (v.description.length > 255) errors.push('Mô tả tối đa 255 ký tự.');
    const ingLines = v.ingredients.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 50);
    if (!ingLines.length) errors.push('Cần ít nhất một nguyên liệu.');
    if (v.instructions.length < 10 || v.instructions.length > 8000) errors.push('Cách làm phải từ 10 đến 8000 ký tự.');
    if (errors.length) {
      return res.status(400).send(layout('Thêm công thức', formHtml(cats, v, errors)));
    }

    await conn.beginTransaction();
    const [ins] = await conn.query(
      'INSERT INTO recipes (title, description, instructions, category_id) VALUES (?, ?, ?, ?)',
      [v.title, v.description, v.instructions, v.category_id]);
    for (const line of ingLines) {
      const [name, qty] = line.split('|').map((s) => s.trim());
      await conn.query('INSERT INTO ingredients (recipe_id, name, quantity) VALUES (?, ?, ?)',
        [ins.insertId, (name || '').slice(0, 120), (qty || '').slice(0, 60)]);
    }
    await conn.commit();
    res.redirect(303, `/recipe/${ins.insertId}`);
  } catch (e) {
    await conn.rollback().catch(() => {});
    next(e);
  } finally {
    conn.release();
  }
});

// 404 + loi chung (khong lo chi tiet loi ra ngoai)
app.use((_req, res) => {
  res.status(404).send(layout('Không tìm thấy', '<h1>404</h1><p>Trang không tồn tại.</p><p><a href="/">Về trang chủ</a></p>'));
});
app.use((err, _req, res, _next) => {
  console.error(JSON.stringify({ level: 'error', msg: 'unhandled_error', error: String(err && err.message) }));
  res.status(500).send(layout('Lỗi', '<h1>500</h1><p>Có lỗi xảy ra, vui lòng thử lại sau.</p>'));
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(JSON.stringify({ level: 'info', msg: 'server_started', port: PORT }));
});
process.on('SIGTERM', () => server.close(() => pool.end().then(() => process.exit(0))));

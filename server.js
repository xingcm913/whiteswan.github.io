/**
 * SWAN 私有搜索引擎 — 后端主服务
 * 端口：3000（可通过 PORT 环境变量修改）
 */
require('./db'); // 初始化数据库
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sanitizeHtml = require('sanitize-html');
const path = require('path');
const crypto = require('crypto');

const db = require('./db');
const searchEngine = require('./search');
const moderation = require('./moderation');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'swan-secret-key-change-in-production';

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ============ 鉴权中间件 ============
function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: '未登录' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: '登录已过期' });
  }
}

function adminAuth(req, res, next) {
  auth(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: '无管理员权限' });
    next();
  });
}

// ============ 工具函数 ============
function genSwanId(custom) {
  if (custom) {
    const clean = custom.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);
    if (clean) return clean;
  }
  return crypto.randomBytes(4).toString('hex');
}

// HTML 白名单清洗（过滤危险脚本，保留常见标签）
const SANITIZE_OPTS = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'video', 'audio', 'iframe', 'canvas', 'svg']),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    '*': ['style', 'class', 'id', 'width', 'height', 'align'],
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title'],
    iframe: ['src', 'frameborder', 'allowfullscreen'],
    video: ['src', 'controls', 'autoplay', 'loop'],
    audio: ['src', 'controls', 'autoplay', 'loop']
  },
  allowedSchemes: ['http', 'https', 'data', 'mailto', 'swan'],
  allowedSchemesByTag: { img: ['http', 'https', 'data'] },
  disallowedTagsMode: 'discard',
  forbidScripts: true
};

// 从 HTML 提取标题、描述、关键词
function extractMeta(html) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
  const kwMatch = html.match(/<meta[^>]+name=["']keywords["'][^>]+content=["']([^"']+)["']/i);
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return {
    title: titleMatch ? titleMatch[1].trim().slice(0, 100) : (h1Match ? h1Match[1].replace(/<[^>]+>/g, '').trim().slice(0, 100) : '未命名页面'),
    description: descMatch ? descMatch[1].trim().slice(0, 300) : searchEngine.stripHtml(html).slice(0, 300),
    keywords: kwMatch ? kwMatch[1].trim() : ''
  };
}

// ============ 认证接口 ============
app.post('/api/auth/register', (req, res) => {
  const { account, password, nickname } = req.body;
  if (!account || !password) return res.status(400).json({ error: '账号和密码不能为空' });
  if (password.length < 6) return res.status(400).json({ error: '密码至少6位' });
  if (!/^1\d{10}$/.test(account) && !/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(account)) {
    return res.status(400).json({ error: '请输入有效的手机号或邮箱' });
  }
  const exists = db.prepare('SELECT id FROM users WHERE account = ?').get(account);
  if (exists) return res.status(400).json({ error: '该账号已注册' });
  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare('INSERT INTO users (account, password, nickname, created_at) VALUES (?,?,?,?)')
    .run(account, hash, nickname || 'SWAN用户', Date.now());
  const token = jwt.sign({ id: info.lastInsertRowid, account, role: 'user' }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: info.lastInsertRowid, account, nickname: nickname || 'SWAN用户', role: 'user' } });
});

app.post('/api/auth/login', (req, res) => {
  const { account, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE account = ?').get(account);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(400).json({ error: '账号或密码错误' });
  }
  const token = jwt.sign({ id: user.id, account: user.account, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, account: user.account, nickname: user.nickname, role: user.role } });
});

app.get('/api/auth/me', auth, (req, res) => {
  const user = db.prepare('SELECT id, account, nickname, role FROM users WHERE id = ?').get(req.user.id);
  res.json({ user });
});

// ============ 网页上传 / 管理 ============
// 上传新网页
app.post('/api/pages', auth, (req, res) => {
  const { html, title, description, keywords, custom_id, visibility } = req.body;
  if (!html) return res.status(400).json({ error: 'HTML 内容不能为空' });

  const meta = extractMeta(html);
  const finalTitle = (title || meta.title || '未命名页面').slice(0, 100);
  const finalDesc = (description || meta.description || '').slice(0, 500);
  const finalKw = keywords || meta.keywords || '';

  const cleaned = sanitizeHtml(html, SANITIZE_OPTS);

  // 生成唯一 swan_id
  let swanId = genSwanId(custom_id);
  let tries = 0;
  while (db.prepare('SELECT id FROM pages WHERE swan_id = ?').get(swanId) && tries < 10) {
    swanId = genSwanId() + crypto.randomBytes(2).toString('hex');
    tries++;
  }

  const now = Date.now();
  const info = db.prepare(`
    INSERT INTO pages (swan_id, user_id, title, description, keywords, html, raw_html, visibility, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `).run(swanId, req.user.id, finalTitle, finalDesc, finalKw, cleaned, html, visibility || 'public', now, now);

  const page = db.prepare('SELECT * FROM pages WHERE id = ?').get(info.lastInsertRowid);

  // 立即入库索引（先发布）
  searchEngine.indexPage(page);
  // AI 异步初审
  moderation.runAiReview(page.id);

  res.json({
    page: {
      id: page.id,
      swan_id: page.swan_id,
      swan_url: `swan://${page.swan_id}`,
      title: page.title,
      description: page.description,
      visibility: page.visibility,
      status: page.status,
      created_at: page.created_at
    }
  });
});

// 我的网页列表
app.get('/api/pages/mine', auth, (req, res) => {
  const rows = db.prepare(`
    SELECT id, swan_id, title, description, visibility, status, views, created_at, updated_at
    FROM pages WHERE user_id = ? ORDER BY created_at DESC
  `).all(req.user.id);
  res.json({ pages: rows });
});

// 更新网页
app.put('/api/pages/:id', auth, (req, res) => {
  const page = db.prepare('SELECT * FROM pages WHERE id = ?').get(req.params.id);
  if (!page) return res.status(404).json({ error: '页面不存在' });
  if (page.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: '无权修改' });
  }
  const { title, description, keywords, html, visibility } = req.body;
  const cleaned = html ? sanitizeHtml(html, SANITIZE_OPTS) : page.html;
  db.prepare(`
    UPDATE pages SET title=?, description=?, keywords=?, html=?, raw_html=?, visibility=?, updated_at=?
    WHERE id = ?
  `).run(
    title || page.title,
    description !== undefined ? description : page.description,
    keywords !== undefined ? keywords : page.keywords,
    cleaned,
    html || page.raw_html,
    visibility || page.visibility,
    Date.now(),
    page.id
  );
  const updated = db.prepare('SELECT * FROM pages WHERE id = ?').get(page.id);
  searchEngine.indexPage(updated);
  moderation.runAiReview(updated.id);
  res.json({ ok: true });
});

// 删除网页
app.delete('/api/pages/:id', auth, (req, res) => {
  const page = db.prepare('SELECT * FROM pages WHERE id = ?').get(req.params.id);
  if (!page) return res.status(404).json({ error: '页面不存在' });
  if (page.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: '无权删除' });
  }
  db.prepare('DELETE FROM pages WHERE id = ?').run(page.id);
  res.json({ ok: true });
});

// ============ 页面浏览（swan:// 协议内部打开） ============
app.get('/api/pages/by-swan/:swanId', (req, res) => {
  const page = db.prepare(`
    SELECT p.*, u.nickname as author
    FROM pages p JOIN users u ON u.id = p.user_id
    WHERE p.swan_id = ?
  `).get(req.params.swanId);
  if (!page) return res.status(404).json({ error: '页面不存在或链接已失效' });
  if (page.status === 'removed' || page.status === 'banned') {
    return res.status(410).json({ error: '该 swan:// 链接已下架/封禁，永久失效' });
  }
  if (page.status === 'flagged') {
    return res.status(403).json({ error: '该页面正在人工复核中，暂不可访问' });
  }
  // 私密页面仅作者可见
  const token = (req.headers.authorization || '').slice(7);
  let viewerId = null;
  if (token) {
    try { viewerId = jwt.verify(token, JWT_SECRET).id; } catch {}
  }
  if (page.visibility === 'private' && page.user_id !== viewerId) {
    return res.status(403).json({ error: '该页面为私密页面' });
  }
  // 记录访问
  db.prepare('UPDATE pages SET views = views + 1 WHERE id = ?').run(page.id);
  db.prepare('INSERT INTO access_logs (page_id, user_id, ip, created_at) VALUES (?,?,?,?)')
    .run(page.id, viewerId, req.ip, Date.now());

  res.json({
    page: {
      id: page.id,
      swan_id: page.swan_id,
      swan_url: `swan://${page.swan_id}`,
      title: page.title,
      description: page.description,
      html: page.html,
      author: page.author,
      views: page.views + 1,
      created_at: page.created_at
    }
  });
});

// 网页快照（纯文本预览）
app.get('/api/pages/:id/snapshot', (req, res) => {
  const page = db.prepare('SELECT * FROM pages WHERE id = ?').get(req.params.id);
  if (!page) return res.status(404).json({ error: '页面不存在' });
  res.json({ snapshot: searchEngine.stripHtml(page.html).slice(0, 500), title: page.title });
});

// 访问日志（页面所有者）
app.get('/api/pages/:id/access-logs', auth, (req, res) => {
  const page = db.prepare('SELECT * FROM pages WHERE id = ?').get(req.params.id);
  if (!page) return res.status(404).json({ error: '页面不存在' });
  if (page.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: '无权查看' });
  }
  const rows = db.prepare(`
    SELECT al.*, u.nickname as visitor
    FROM access_logs al LEFT JOIN users u ON u.id = al.user_id
    WHERE al.page_id = ? ORDER BY al.created_at DESC LIMIT 100
  `).all(page.id);
  res.json({ logs: rows });
});

// ============ 搜索接口 ============
app.get('/api/search', (req, res) => {
  const { q, page = 1, pageSize = 10, sort = 'relevance' } = req.query;
  if (!q) return res.json({ results: [], total: 0, correction: null });
  const result = searchEngine.search(q, { page: +page, pageSize: +pageSize, sort });
  let correction = null;
  if (result.total === 0) {
    correction = searchEngine.suggestCorrection(q);
  }
  // 记录搜索日志（可选登录）
  const token = (req.headers.authorization || '').slice(7);
  let userId = null;
  if (token) { try { userId = jwt.verify(token, JWT_SECRET).id; } catch {} }
  searchEngine.logSearch(userId, q, result.total);
  res.json({ ...result, correction });
});

app.get('/api/search/suggest', (req, res) => {
  res.json({ suggestions: searchEngine.suggest(req.query.q || '') });
});

app.get('/api/search/hot', (req, res) => {
  res.json({ hot: searchEngine.hotSearches(10) });
});

// 我的搜索历史
app.get('/api/search/history', auth, (req, res) => {
  const rows = db.prepare(`
    SELECT DISTINCT query, MAX(created_at) as last_time
    FROM search_logs WHERE user_id = ?
    GROUP BY query ORDER BY last_time DESC LIMIT 20
  `).all(req.user.id);
  res.json({ history: rows });
});

// ============ 管理员接口 ============
app.get('/api/admin/stats', adminAuth, (req, res) => {
  const users = db.prepare('SELECT COUNT(*) c FROM users').get().c;
  const pages = db.prepare('SELECT COUNT(*) c FROM pages').get().c;
  const publicPages = db.prepare("SELECT COUNT(*) c FROM pages WHERE status='approved' AND visibility='public'").get().c;
  const flagged = db.prepare("SELECT COUNT(*) c FROM pages WHERE status='flagged'").get().c;
  const searches = db.prepare('SELECT COUNT(*) c FROM search_logs').get().c;
  const accesses = db.prepare('SELECT COUNT(*) c FROM access_logs').get().c;
  res.json({ users, pages, publicPages, flagged, searches, accesses });
});

app.get('/api/admin/users', adminAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT u.id, u.account, u.nickname, u.role, u.created_at,
      (SELECT COUNT(*) FROM pages p WHERE p.user_id = u.id) as page_count
    FROM users u ORDER BY u.created_at DESC
  `).all();
  res.json({ users: rows });
});

app.get('/api/admin/pages', adminAuth, (req, res) => {
  const { status, page = 1, pageSize = 20 } = req.query;
  let sql = `SELECT p.*, u.nickname as author, u.account as author_account FROM pages p JOIN users u ON u.id = p.user_id`;
  const params = [];
  if (status) { sql += ` WHERE p.status = ?`; params.push(status); }
  sql += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
  params.push(+pageSize, (page - 1) * pageSize);
  const rows = db.prepare(sql).all(...params);
  const total = db.prepare(status ? `SELECT COUNT(*) c FROM pages WHERE status = ?` : `SELECT COUNT(*) c FROM pages`).get(...(status ? [status] : [])).c;
  res.json({ pages: rows, total });
});

app.get('/api/admin/review/pending', adminAuth, (req, res) => {
  res.json(moderation.getPendingReview(+req.query.page || 1, +req.query.pageSize || 20));
});

app.post('/api/admin/review/:pageId', adminAuth, (req, res) => {
  const { action, reason } = req.body;
  try {
    moderation.adminReview(req.params.pageId, req.user.id, action, reason);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/admin/review/logs', adminAuth, (req, res) => {
  res.json(moderation.getReviewLogs(+req.query.page || 1, +req.query.pageSize || 50));
});

// ============ 启动 ============
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  🦢 SWAN 私有搜索引擎已启动`);
  console.log(`  本地访问: http://localhost:${PORT}`);
  console.log(`  管理员账号: admin / admin123\n`);
});

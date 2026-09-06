/**
 * SWAN 搜索引擎核心
 * - 中文分词（二元切分 + 英文单词）
 * - 倒排索引 + TF-IDF 排序
 * - 支持模糊匹配、智能纠错（编辑距离）、联想搜索
 */
const db = require('./db');

// 停用词
const STOPWORDS = new Set([
  '的','了','是','在','我','有','和','就','不','人','都','一','一个','上','也','很','到','说','要','去',
  '你','会','着','没有','看','好','自己','这','那','他','她','它','们','而','与','及','或','但','是',
  'the','a','an','is','are','was','were','be','been','of','to','in','on','at','for','and','or','but'
]);

/**
 * 分词：英文按单词，中文按二元切分（bigram），兼顾单字
 */
function tokenize(text) {
  if (!text) return [];
  text = String(text).toLowerCase();
  const tokens = [];
  // 英文单词
  const enWords = text.match(/[a-z0-9]+/g) || [];
  enWords.forEach(w => { if (w.length > 1 && !STOPWORDS.has(w)) tokens.push(w); });
  // 中文 bigram + 单字
  const chinese = text.match(/[\u4e00-\u9fa5]+/g) || [];
  chinese.forEach(seg => {
    for (let i = 0; i < seg.length; i++) {
      const ch = seg[i];
      if (!STOPWORDS.has(ch)) tokens.push(ch);
      if (i < seg.length - 1) {
        const bi = seg.substr(i, 2);
        tokens.push(bi);
      }
    }
  });
  return tokens;
}

/**
 * 为页面构建索引
 */
function indexPage(page) {
  // 删除旧索引
  db.prepare('DELETE FROM search_index WHERE page_id = ?').run(page.id);
  const insert = db.prepare(
    'INSERT INTO search_index (page_id, token, tf, field) VALUES (?,?,?,?)'
  );

  const fields = {
    title: { text: page.title, weight: 5 },
    description: { text: page.description, weight: 3 },
    keywords: { text: page.keywords, weight: 4 },
    content: { text: stripHtml(page.html), weight: 1 }
  };

  const tx = db.transaction(() => {
    for (const [field, cfg] of Object.entries(fields)) {
      const tokens = tokenize(cfg.text);
      const freq = {};
      tokens.forEach(t => { freq[t] = (freq[t] || 0) + 1; });
      const total = tokens.length || 1;
      for (const [token, count] of Object.entries(freq)) {
        const tf = (count / total) * cfg.weight;
        insert.run(page.id, token, tf, field);
      }
    }
  });
  tx();
}

/**
 * 去除HTML标签提取纯文本
 */
function stripHtml(html) {
  if (!html) return '';
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 搜索：返回带评分的结果
 */
function search(query, { page = 1, pageSize = 10, sort = 'relevance' } = {}) {
  const tokens = tokenize(query);
  if (tokens.length === 0) return { results: [], total: 0 };

  const placeholders = tokens.map(() => '?').join(',');
  // 计算 IDF = log(N / df)
  const totalPages = db.prepare("SELECT COUNT(*) c FROM pages WHERE status='approved' AND visibility='public'").get().c || 1;

  const rows = db.prepare(`
    SELECT si.page_id, SUM(si.tf) as score
    FROM search_index si
    JOIN pages p ON p.id = si.page_id
    WHERE si.token IN (${placeholders})
      AND p.status = 'approved'
      AND p.visibility = 'public'
    GROUP BY si.page_id
  `).all(...tokens);

  if (rows.length === 0) return { results: [], total: 0 };

  // 计算 IDF 加权
  const results = rows.map(r => {
    const df = rows.length;
    const idf = Math.log((totalPages + 1) / (df + 1)) + 1;
    return { page_id: r.page_id, score: r.score * idf };
  });

  // 获取页面详情
  const ids = results.map(r => r.page_id);
  const pages = db.prepare(`
    SELECT p.*, u.nickname as author
    FROM pages p JOIN users u ON u.id = p.user_id
    WHERE p.id IN (${ids.map(() => '?').join(',')})
  `).all(...ids);

  const pageMap = {};
  pages.forEach(p => { pageMap[p.id] = p; });

  let merged = results.map(r => ({ ...pageMap[r.page_id], score: r.score }))
    .filter(r => r.id !== undefined);

  // 排序
  if (sort === 'views') {
    merged.sort((a, b) => b.views - a.views);
  } else if (sort === 'newest') {
    merged.sort((a, b) => b.created_at - a.created_at);
  } else {
    merged.sort((a, b) => (b.score * b.weight) - (a.score * a.weight));
  }

  const total = merged.length;
  const start = (page - 1) * pageSize;
  const paged = merged.slice(start, start + pageSize).map(p => ({
    id: p.id,
    swan_id: p.swan_id,
    title: p.title,
    description: p.description,
    author: p.author,
    views: p.views,
    created_at: p.created_at,
    score: p.score
  }));

  return { results: paged, total };
}

/**
 * 智能纠错：返回最相近的已存在词
 */
function suggestCorrection(query) {
  const tokens = tokenize(query);
  if (tokens.length === 0) return null;
  // 用第一个 token 找近似词
  const target = tokens[0];
  const allTokens = db.prepare('SELECT DISTINCT token FROM search_index').all();
  let best = null, bestDist = Infinity;
  for (const row of allTokens) {
    const d = editDistance(target, row.token);
    if (d < bestDist && d > 0 && d <= 2) {
      bestDist = d;
      best = row.token;
    }
  }
  return best;
}

function editDistance(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

/**
 * 联想搜索：根据前缀匹配已有索引词
 */
function suggest(query) {
  if (!query) return [];
  const q = query.toLowerCase();
  const rows = db.prepare(`
    SELECT token, COUNT(*) c FROM search_index
    WHERE token LIKE ?
    GROUP BY token ORDER BY c DESC LIMIT 8
  `).all(q + '%');
  return rows.map(r => r.token);
}

/**
 * 热门搜索榜
 */
function hotSearches(limit = 10) {
  return db.prepare('SELECT query, count FROM hot_searches ORDER BY count DESC LIMIT ?').all(limit);
}

/**
 * 记录搜索
 */
function logSearch(userId, query, resultCount) {
  db.prepare('INSERT INTO search_logs (user_id, query, result_count, created_at) VALUES (?,?,?,?)')
    .run(userId || null, query, resultCount, Date.now());
  // 更新热词
  const existing = db.prepare('SELECT id FROM hot_searches WHERE query = ?').get(query);
  if (existing) {
    db.prepare('UPDATE hot_searches SET count = count + 1, updated_at = ? WHERE query = ?')
      .run(Date.now(), query);
  } else {
    db.prepare('INSERT INTO hot_searches (query, count, updated_at) VALUES (?,?,?)')
      .run(query, 1, Date.now());
  }
}

module.exports = { indexPage, search, suggest, suggestCorrection, hotSearches, logSearch, tokenize, stripHtml };

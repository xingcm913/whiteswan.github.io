/* SWAN 私有搜索引擎 — 前端 SPA 逻辑 */
const API = ''; // 同源
let currentUser = null;
let currentView = 'home';
let viewerHistory = [];
let viewerIndex = -1;

// ============ 工具 ============
function $(id) { return document.getElementById(id); }
function token() { return localStorage.getItem('swan_token'); }
function setToken(t) { localStorage.setItem('swan_token', t); }
function headers() { return { 'Content-Type': 'application/json', ...(token() ? { Authorization: 'Bearer ' + token() } : {}) }; }

async function api(method, path, body) {
  const opts = { method, headers: headers() };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API + path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '请求失败');
  return data;
}

function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return s + '秒前';
  if (s < 3600) return Math.floor(s/60) + '分钟前';
  if (s < 86400) return Math.floor(s/3600) + '小时前';
  return Math.floor(s/86400) + '天前';
}

function statusBadge(s) {
  const map = { approved: 'public', pending: 'private', flagged: 'flagged', removed: 'removed', banned: 'banned' };
  return `<span class="badge ${map[s]||'public'}">${s}</span>`;
}
function visBadge(v) {
  return `<span class="badge ${v}">${v==='public'?'公开':v==='private'?'私密':'隐藏'}</span>`;
}

// ============ 认证 ============
async function checkAuth() {
  if (!token()) { currentUser = null; updateNav(); return; }
  try {
    const { user } = await api('GET', '/api/auth/me');
    currentUser = user;
  } catch { currentUser = null; setToken(''); }
  updateNav();
}

function updateNav() {
  if (currentUser) {
    $('loginBtn').style.display = 'none';
    $('logoutBtn').style.display = 'inline-block';
    $('logoutBtn').textContent = currentUser.nickname;
    $('adminBtn').style.display = currentUser.role === 'admin' ? 'inline-block' : 'none';
  } else {
    $('loginBtn').style.display = 'inline-block';
    $('logoutBtn').style.display = 'none';
    $('adminBtn').style.display = 'none';
  }
}

function showAuth(type) {
  $('authModal').style.display = 'flex';
  switchAuthTab(type);
}
function closeAuth() { $('authModal').style.display = 'none'; }
function switchAuthTab(type) {
  $('tabLogin').classList.toggle('active', type === 'login');
  $('tabRegister').classList.toggle('active', type === 'register');
  $('authTitle').textContent = type === 'login' ? '登录 SWAN' : '注册 SWAN';
  $('authSubmit').textContent = type === 'login' ? '登录' : '注册';
  $('nicknameGroup').style.display = type === 'register' ? 'block' : 'none';
  $('authAccount').value = ''; $('authPassword').value = ''; $('authNickname').value = '';
}

async function submitAuth() {
  const account = $('authAccount').value.trim();
  const password = $('authPassword').value;
  const nickname = $('authNickname').value.trim();
  const isLogin = $('tabLogin').classList.contains('active');
  try {
    const path = isLogin ? '/api/auth/login' : '/api/auth/register';
    const body = isLogin ? { account, password } : { account, password, nickname };
    const { token: t, user } = await api('POST', path, body);
    setToken(t); currentUser = user;
    closeAuth(); updateNav(); toast(isLogin ? '登录成功' : '注册成功');
    if (currentView === 'home') renderHome();
  } catch (e) { toast(e.message); }
}

function logout() {
  setToken(''); currentUser = null; updateNav(); go('home'); toast('已退出');
}

// ============ 路由 ============
function go(view, params) {
  currentView = view;
  viewerHistory = []; viewerIndex = -1;
  window.scrollTo(0, 0);
  switch (view) {
    case 'home': renderHome(); break;
    case 'search': renderSearch(params); break;
    case 'viewer': renderViewer(params); break;
    case 'upload': requireAuth(() => renderUpload()); break;
    case 'user': requireAuth(() => renderUser()); break;
    case 'admin': requireAdmin(() => renderAdmin()); break;
    default: renderHome();
  }
}

function requireAuth(cb) {
  if (!currentUser) { toast('请先登录'); showAuth('login'); return; }
  cb();
}
function requireAdmin(cb) {
  if (!currentUser || currentUser.role !== 'admin') { toast('无权限'); go('home'); return; }
  cb();
}

// ============ 首页 ============
async function renderHome() {
  const main = $('main');
  main.innerHTML = `
    <div class="home-container">
      <div class="home-logo">🦢 <span class="grad">SWAN</span></div>
      <div class="home-slogan">私有搜索引擎 · 用户自建 · 私有协议 · 封闭生态</div>
      <div class="home-search">
        <div class="search-box">
          <input id="homeSearchInput" type="text" placeholder="输入关键词搜索私有网页..." oninput="onSearchInput(this.value,'homeSuggest')" onkeydown="if(event.key==='Enter')doSearch()">
          <button onclick="doSearch()">🔍 搜索</button>
        </div>
        <div id="homeSuggest" class="suggest-box"></div>
      </div>
      <div class="hot-section" id="hotSection"><div class="hot-title">🔥 热门搜索</div><div class="hot-list" id="hotList">加载中...</div></div>
    </div>`;
  setTimeout(() => $('homeSearchInput')?.focus(), 100);
  try {
    const { hot } = await api('GET', '/api/search/hot');
    $('hotList').innerHTML = hot.length ? hot.map(h => `<span class="hot-tag" onclick="go('search',{q:'${h.query}'})">${h.query} <small>${h.count}</small></span>`).join('') : '暂无热门搜索';
  } catch {}
}

// ============ 搜索 ============
let searchTimer = null;
async function onSearchInput(val, boxId) {
  clearTimeout(searchTimer);
  if (!val.trim()) { (boxId ? $(boxId) : $('suggestBox')).style.display = 'none'; return; }
  searchTimer = setTimeout(async () => {
    try {
      const { suggestions } = await api('GET', '/api/search/suggest?q=' + encodeURIComponent(val));
      const box = boxId ? $(boxId) : $('suggestBox');
      if (suggestions.length) {
        box.innerHTML = suggestions.map(s => `<div class="suggest-item" onclick="doSearch('${s}')">${s}</div>`).join('');
        box.style.display = 'block';
      } else box.style.display = 'none';
    } catch {}
  }, 200);
}

async function doSearch(q) {
  const input = $('homeSearchInput') || $('topSearchInput');
  const query = (q || (input ? input.value : '')).trim();
  if (!query) return;
  (q ? null : ($('suggestBox').style.display = 'none'));
  if ($('homeSuggest')) $('homeSuggest').style.display = 'none';
  go('search', { q: query });
}

async function renderSearch({ q, sort = 'relevance', page = 1 }) {
  const main = $('main');
  main.innerHTML = `
    <div class="container">
      <div class="result-header">
        <div style="color:#fff">搜索 "<b>${q}</b>" — <span id="resultCount">搜索中...</span></div>
        <div class="result-sort">
          <select id="sortSel" onchange="renderSearch({q:'${q.replace(/'/g,"\\'")}', sort:this.value})">
            <option value="relevance" ${sort==='relevance'?'selected':''}>相关度</option>
            <option value="views" ${sort==='views'?'selected':''}>热度</option>
            <option value="newest" ${sort==='newest'?'selected':''}>最新发布</option>
          </select>
        </div>
      </div>
      <div id="results"></div>
    </div>`;
  $('topSearchInput').value = q;
  try {
    const { results, total, correction } = await api('GET', `/api/search?q=${encodeURIComponent(q)}&sort=${sort}&page=${page}`);
    $('resultCount').textContent = `共 ${total} 条结果`;
    let html = '';
    if (correction) html += `<div class="correction">您是不是要找：<a onclick="go('search',{q:'${correction}'})">${correction}</a></div>`;
    if (results.length === 0) {
      html += '<div class="card" style="text-align:center;color:#666">未找到相关私有网页，换个关键词试试？</div>';
    } else {
      html += results.map(r => `
        <div class="result-item" onclick="openSwan('${r.swan_id}')">
          <div class="result-title">${r.title}</div>
          <div class="result-url">swan://${r.swan_id}</div>
          <div class="result-desc">${r.description || '暂无简介'}</div>
          <div class="result-meta">作者：${r.author} · 浏览 ${r.views} · ${timeAgo(r.created_at)}</div>
        </div>`).join('');
    }
    $('results').innerHTML = html;
  } catch (e) { toast(e.message); }
}

// ============ swan:// 浏览页 ============
async function openSwan(swanId) {
  viewerHistory.push(swanId);
  viewerIndex = viewerHistory.length - 1;
  renderViewer({ swanId });
}

async function renderViewer({ swanId }) {
  const main = $('main');
  main.innerHTML = `
    <div class="viewer">
      <div class="viewer-bar">
        <button onclick="viewerBack()">◀ 返回</button>
        <button onclick="viewerForward()">前进 ▶</button>
        <div class="viewer-url">swan://${swanId}</div>
        <button onclick="navigator.clipboard.writeText('swan://${swanId}');toast('链接已复制')">📋 复制链接</button>
      </div>
      <div class="viewer-frame" id="viewerFrame"><div class="loading">加载中...</div></div>
    </div>`;
  try {
    const { page } = await api('GET', '/api/pages/by-swan/' + encodeURIComponent(swanId));
    $('viewerFrame').innerHTML = `
      <div class="viewer-meta">
        <h1>${page.title}</h1>
        <div>作者：${page.author} · 浏览 ${page.views} · ${new Date(page.created_at).toLocaleString()}</div>
      </div>
      <div class="viewer-content">${page.html}</div>`;
  } catch (e) {
    $('viewerFrame').innerHTML = `<div style="text-align:center;color:#999;padding:60px">${e.message}</div>`;
  }
}

function viewerBack() {
  if (viewerIndex > 0) { viewerIndex--; renderViewer({ swanId: viewerHistory[viewerIndex] }); }
  else go('home');
}
function viewerForward() {
  if (viewerIndex < viewerHistory.length - 1) { viewerIndex++; renderViewer({ swanId: viewerHistory[viewerIndex] }); }
}

// ============ 上传中心 ============
function renderUpload() {
  const main = $('main');
  main.innerHTML = `
    <div class="container">
      <div class="card">
        <h3>📤 上传网页</h3>
        <p style="color:#666;margin-bottom:14px">粘贴完整 HTML 源码，系统将自动清洗、提取标题、分配专属 swan:// 私有链接并立即上线入库。</p>
        <div class="form-group">
          <label>页面标题（留空则自动从 HTML 提取）</label>
          <input id="upTitle" type="text" placeholder="例如：我的个人主页">
        </div>
        <div class="form-group">
          <label>自定义 swan:// 前缀（留空自动生成，只能字母数字_-）</label>
          <input id="upCustomId" type="text" placeholder="例如 mypage">
        </div>
        <div class="form-group">
          <label>页面简介（留空自动提取）</label>
          <input id="upDesc" type="text" placeholder="一句话描述">
        </div>
        <div class="form-group">
          <label>可见性</label>
          <select id="upVis">
            <option value="public">公开（所有人可搜索浏览）</option>
            <option value="private">私密（仅自己可见）</option>
          </select>
        </div>
        <div class="form-group">
          <label>HTML 源码 *</label>
          <textarea id="upHtml" style="min-height:240px" placeholder="<!DOCTYPE html><html>..."></textarea>
        </div>
        <button class="btn primary" onclick="submitUpload()">发布上线</button>
      </div>
    </div>`;
}

async function submitUpload() {
  const html = $('upHtml').value.trim();
  if (!html) { toast('请输入 HTML 源码'); return; }
  // 先弹免责声明
  $('disclaimerModal').style.display = 'flex';
  $('agreeDisclaimer').checked = false;
  window._pendingUpload = {
    title: $('upTitle').value.trim(),
    description: $('upDesc').value.trim(),
    custom_id: $('upCustomId').value.trim(),
    visibility: $('upVis').value,
    html
  };
}

async function confirmDisclaimer() {
  if (!$('agreeDisclaimer').checked) { toast('请勾选同意声明'); return; }
  $('disclaimerModal').style.display = 'none';
  try {
    const { page } = await api('POST', '/api/pages', window._pendingUpload);
    toast('上传成功，已立即上线入库！');
    setTimeout(() => openSwan(page.swan_id), 800);
  } catch (e) { toast(e.message); }
}

// ============ 个人中心 ============
async function renderUser() {
  const main = $('main');
  main.innerHTML = `
    <div class="container">
      <div class="card">
        <h3>👤 ${currentUser.nickname}（${currentUser.account}）</h3>
        <div class="tabs">
          <div class="tab active" onclick="switchUserTab('pages', this)">我的网页</div>
          <div class="tab" onclick="switchUserTab('search', this)">搜索记录</div>
        </div>
        <div id="userTabContent">加载中...</div>
      </div>
    </div>`;
  loadUserPages();
}

async function switchUserTab(tab, el) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  if (tab === 'pages') loadUserPages();
  else loadUserSearch();
}

async function loadUserPages() {
  try {
    const { pages } = await api('GET', '/api/pages/mine');
    const html = pages.length ? pages.map(p => `
      <div class="page-card">
        <div class="page-card-info" style="cursor:pointer" onclick="openSwan('${p.swan_id}')">
          <div class="page-card-title">${p.title} ${visBadge(p.visibility)} ${statusBadge(p.status)}</div>
          <div class="page-card-url">swan://${p.swan_id} · 浏览 ${p.views}</div>
        </div>
        <div class="page-card-actions">
          <button class="btn" onclick="editPage(${p.id})">编辑</button>
          <button class="btn danger" onclick="deletePage(${p.id})">删除</button>
        </div>
      </div>`).join('') : '<div style="color:#999;text-align:center;padding:20px">还没有上传网页</div>';
    $('userTabContent').innerHTML = `<div class="page-list">${html}</div>`;
  } catch (e) { toast(e.message); }
}

async function loadUserSearch() {
  try {
    const { history } = await api('GET', '/api/search/history');
    const html = history.length ? history.map(h => `<div class="page-card" onclick="go('search',{q:'${h.query}'})"><div class="page-card-info"><div class="page-card-title">${h.query}</div><div class="page-card-url">${timeAgo(h.last_time)}</div></div></div>`).join('') : '<div style="color:#999;text-align:center;padding:20px">暂无搜索记录</div>';
    $('userTabContent').innerHTML = `<div class="page-list">${html}</div>`;
  } catch (e) { toast(e.message); }
}

async function editPage(id) {
  // 简单编辑：打开 prompt 方式，或加载一个编辑表单
  const pages = await api('GET', '/api/pages/mine');
  const p = pages.pages.find(x => x.id === id);
  const html = prompt('编辑 HTML 源码（当前内容需自行粘贴修改）：', '');
  if (html === null) return;
  try {
    await api('PUT', '/api/pages/' + id, { html });
    toast('更新成功'); loadUserPages();
  } catch (e) { toast(e.message); }
}

async function deletePage(id) {
  if (!confirm('确定删除该网页？删除后 swan:// 链接将永久失效。')) return;
  try { await api('DELETE', '/api/pages/' + id); toast('已删除'); loadUserPages(); }
  catch (e) { toast(e.message); }
}

// ============ 管理员后台 ============
async function renderAdmin() {
  const main = $('main');
  main.innerHTML = `
    <div class="container">
      <div class="card"><h3>🛡️ SWAN 管理后台</h3><div id="adminStats" class="stats-grid">加载中...</div></div>
      <div class="card">
        <div class="tabs">
          <div class="tab active" onclick="switchAdminTab('review', this)">待复核 (${0})</div>
          <div class="tab" onclick="switchAdminTab('pages', this)">全部网页</div>
          <div class="tab" onclick="switchAdminTab('users', this)">用户管理</div>
          <div class="tab" onclick="switchAdminTab('logs', this)">审核日志</div>
        </div>
        <div id="adminTabContent"></div>
      </div>
    </div>`;
  loadAdminStats();
  switchAdminTab('review', document.querySelector('.tab.active'));
}

async function loadAdminStats() {
  try {
    const s = await api('GET', '/api/admin/stats');
    $('adminStats').innerHTML = `
      <div class="stat-card"><div class="stat-num">${s.users}</div><div class="stat-label">用户总数</div></div>
      <div class="stat-card"><div class="stat-num">${s.pages}</div><div class="stat-label">网页总数</div></div>
      <div class="stat-card"><div class="stat-num">${s.publicPages}</div><div class="stat-label">公开上线</div></div>
      <div class="stat-card"><div class="stat-num">${s.flagged}</div><div class="stat-label">待复核</div></div>
      <div class="stat-card"><div class="stat-num">${s.searches}</div><div class="stat-label">搜索次数</div></div>
      <div class="stat-card"><div class="stat-num">${s.accesses}</div><div class="stat-label">访问次数</div></div>`;
  } catch {}
}

function switchAdminTab(tab, el) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  if (tab === 'review') loadPendingReview();
  else if (tab === 'pages') loadAllPages();
  else if (tab === 'users') loadUsers();
  else loadReviewLogs();
}

async function loadPendingReview() {
  const c = $('adminTabContent');
  c.innerHTML = '<div class="loading">加载中...</div>';
  try {
    const { rows, total } = await api('GET', '/api/admin/review/pending');
    c.innerHTML = `<div style="margin-bottom:10px;color:#666">待人工复核：${total} 条（AI 已标记可疑）</div>` +
      (rows.length ? `<div class="table-wrap"><table><tr><th>标题</th><th>swan://</th><th>作者</th><th>提交时间</th><th>操作</th></tr>` +
      rows.map(r => `<tr><td>${r.title}</td><td><a style="cursor:pointer;color:var(--accent)" onclick="openSwan('${r.swan_id}')">swan://${r.swan_id}</a></td><td>${r.author}</td><td>${timeAgo(r.created_at)}</td>
        <td><button class="btn primary" onclick="adminReview(${r.id},'approve')">放行</button>
            <button class="btn danger" onclick="adminReview(${r.id},'remove')">下架</button>
            <button class="btn" style="background:#333;color:#fff" onclick="adminReview(${r.id},'ban')">封禁</button></td></tr>`).join('') +
      `</table></div>` : '<div style="color:#999;text-align:center;padding:20px">暂无待复核内容</div>');
  } catch (e) { c.innerHTML = e.message; }
}

async function loadAllPages() {
  const c = $('adminTabContent');
  c.innerHTML = '<div class="loading">加载中...</div>';
  try {
    const { pages, total } = await api('GET', '/api/admin/pages?pageSize=50');
    c.innerHTML = `<div style="margin-bottom:10px;color:#666">共 ${total} 个网页</div><div class="table-wrap"><table><tr><th>ID</th><th>标题</th><th>swan://</th><th>作者</th><th>状态</th><th>浏览</th><th>操作</th></tr>` +
      pages.map(p => `<tr><td>${p.id}</td><td>${p.title}</td><td>swan://${p.swan_id}</td><td>${p.author}</td><td>${statusBadge(p.status)}</td><td>${p.views}</td>
        <td>${p.status==='flagged'?`<button class="btn primary" onclick="adminReview(${p.id},'approve')">放行</button> <button class="btn danger" onclick="adminReview(${p.id},'remove')">下架</button>`:`<button class="btn danger" onclick="adminReview(${p.id},'remove')">下架</button>`}</td></tr>`).join('') +
      `</table></div>`;
  } catch (e) { c.innerHTML = e.message; }
}

async function loadUsers() {
  const c = $('adminTabContent');
  try {
    const { users } = await api('GET', '/api/admin/users');
    c.innerHTML = `<div class="table-wrap"><table><tr><th>ID</th><th>账号</th><th>昵称</th><th>角色</th><th>网页数</th><th>注册时间</th></tr>` +
      users.map(u => `<tr><td>${u.id}</td><td>${u.account}</td><td>${u.nickname}</td><td>${u.role}</td><td>${u.page_count}</td><td>${new Date(u.created_at).toLocaleDateString()}</td></tr>`).join('') +
      `</table></div>`;
  } catch (e) { c.innerHTML = e.message; }
}

async function loadReviewLogs() {
  const c = $('adminTabContent');
  try {
    const { rows } = await api('GET', '/api/admin/review/logs?pageSize=100');
    c.innerHTML = `<div class="table-wrap"><table><tr><th>时间</th><th>页面</th><th>审核者</th><th>操作</th><th>原因</th></tr>` +
      rows.map(r => `<tr><td>${new Date(r.created_at).toLocaleString()}</td><td>${r.page_title||'已删除'} (${r.swan_id||'-'})</td><td>${r.reviewer}</td><td>${r.action}</td><td>${r.reason}</td></tr>`).join('') +
      `</table></div>`;
  } catch (e) { c.innerHTML = e.message; }
}

async function adminReview(pageId, action) {
  const reason = action === 'approve' ? '人工审核通过' : prompt('请输入处理原因：', '违规内容');
  if (reason === null) return;
  try {
    await api('POST', '/api/admin/review/' + pageId, { action, reason });
    toast('处理成功'); loadPendingReview(); loadAdminStats();
  } catch (e) { toast(e.message); }
}

// ============ 启动 ============
async function init() {
  await checkAuth();
  go('home');
}
init();

/**
 * SWAN 内容审核模块
 * 机制：先发布 -> AI 异步初审（标记可疑/临时隐藏）-> 人工终审
 * AI 无权永久删除，仅标记 flag，最终决定权归管理员
 */
const db = require('./db');
const { stripHtml } = require('./search');

// 违规关键词库（可扩展）— 仅作 AI 初审标记依据
const SENSITIVE_KEYWORDS = [
  // 涉政敏感词示例（生产环境应替换为完整合规词库）
  '反动', '颠覆', '暴乱',
  // 色情低俗
  '色情', '裸聊', '一夜情', '成人视频',
  // 暴力恐怖
  '恐怖袭击', '极端主义', '杀人教程',
  // 违法违规
  '赌博', '博彩', '毒品', '枪支买卖', '洗钱',
  // 诈骗
  '刷单返利', '网络兼职诈骗', '包过包过',
  // 侵权
  '破解版', '盗版下载'
];

/**
 * AI 初审：扫描 HTML 纯文本，命中敏感词则标记可疑
 * 返回 { flagged: bool, reasons: [] }
 */
function aiReview(page) {
  // AI 仅审查实际发布的清洗后内容（raw_html 仅存档供管理员追溯）
  const text = stripHtml(page.html).toLowerCase();
  const reasons = [];
  for (const kw of SENSITIVE_KEYWORDS) {
    if (text.includes(kw.toLowerCase())) {
      reasons.push(`命中敏感词: ${kw}`);
    }
  }
  // 检测危险脚本残留（基于已清洗后的发布内容）
  const dangerous = /<\s*script|onerror\s*=|javascript:|eval\s*\(|document\.cookie/i.test(page.html);
  if (dangerous) reasons.push('检测到潜在危险脚本残留');

  return { flagged: reasons.length > 0, reasons };
}

/**
 * 对新上传页面执行 AI 初审（异步，不阻塞发布）
 */
function runAiReview(pageId) {
  setImmediate(() => {
    const page = db.prepare('SELECT * FROM pages WHERE id = ?').get(pageId);
    if (!page) return;
    const result = aiReview(page);
    if (result.flagged) {
      // AI 标记可疑，临时隐藏（status=flagged），等待人工复核
      db.prepare("UPDATE pages SET status = 'flagged' WHERE id = ?").run(pageId);
      db.prepare('INSERT INTO review_logs (page_id, reviewer, action, reason, created_at) VALUES (?,?,?,?,?)')
        .run(pageId, 'ai', 'flag', result.reasons.join('; '), Date.now());
    } else {
      db.prepare('INSERT INTO review_logs (page_id, reviewer, action, reason, created_at) VALUES (?,?,?,?,?)')
        .run(pageId, 'ai', 'approve', 'AI初审通过', Date.now());
    }
  });
}

/**
 * 管理员终审操作
 * action: approve | remove | ban
 */
function adminReview(pageId, adminId, action, reason) {
  const validActions = ['approve', 'remove', 'ban'];
  if (!validActions.includes(action)) throw new Error('无效操作');
  const statusMap = { approve: 'approved', remove: 'removed', ban: 'banned' };
  db.prepare('UPDATE pages SET status = ? WHERE id = ?').run(statusMap[action], pageId);
  db.prepare('INSERT INTO review_logs (page_id, reviewer, action, reason, created_at) VALUES (?,?,?,?,?)')
    .run(pageId, `admin:${adminId}`, action, reason || '', Date.now());
}

/**
 * 待人工复核清单
 */
function getPendingReview(page = 1, pageSize = 20) {
  const total = db.prepare("SELECT COUNT(*) c FROM pages WHERE status = 'flagged'").get().c;
  const rows = db.prepare(`
    SELECT p.*, u.nickname as author, u.account as author_account
    FROM pages p JOIN users u ON u.id = p.user_id
    WHERE p.status = 'flagged'
    ORDER BY p.created_at DESC LIMIT ? OFFSET ?
  `).all(pageSize, (page - 1) * pageSize);
  return { rows, total };
}

/**
 * 全部审核日志
 */
function getReviewLogs(page = 1, pageSize = 50) {
  const total = db.prepare('SELECT COUNT(*) c FROM review_logs').get().c;
  const rows = db.prepare(`
    SELECT rl.*, p.title as page_title, p.swan_id
    FROM review_logs rl LEFT JOIN pages p ON p.id = rl.page_id
    ORDER BY rl.created_at DESC LIMIT ? OFFSET ?
  `).all(pageSize, (page - 1) * pageSize);
  return { rows, total };
}

module.exports = { runAiReview, adminReview, getPendingReview, getReviewLogs, aiReview };

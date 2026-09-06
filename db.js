/**
 * SWAN 云端数据库层
 * 使用 SQLite（生产可一键切换 PostgreSQL/MySQL）
 * 存储：用户、网页、搜索索引、审核记录、访问日志、搜索日志
 */
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'swan_cloud.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ============ 建表 ============
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account TEXT UNIQUE NOT NULL,        -- 手机号或邮箱
  password TEXT NOT NULL,
  nickname TEXT DEFAULT 'SWAN用户',
  role TEXT DEFAULT 'user',            -- user / admin
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  swan_id TEXT UNIQUE NOT NULL,        -- swan:// 前缀ID
  user_id INTEGER NOT NULL,
  title TEXT DEFAULT '未命名页面',
  description TEXT DEFAULT '',
  keywords TEXT DEFAULT '',
  html TEXT NOT NULL,                  -- 清洗后的HTML源码
  raw_html TEXT,                       -- 原始HTML（管理员可查）
  visibility TEXT DEFAULT 'public',    -- public / private / hidden
  status TEXT DEFAULT 'approved',      -- approved / pending / flagged / removed / banned
  weight REAL DEFAULT 1.0,             -- 网页权重
  views INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS search_index (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_id INTEGER NOT NULL,
  token TEXT NOT NULL,
  tf REAL NOT NULL,                    -- 词频
  field TEXT DEFAULT 'content',        -- title / description / keywords / content
  FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_index_token ON search_index(token);
CREATE INDEX IF NOT EXISTS idx_index_page ON search_index(page_id);

CREATE TABLE IF NOT EXISTS review_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_id INTEGER NOT NULL,
  reviewer TEXT NOT NULL,              -- ai / admin:<id>
  action TEXT NOT NULL,                -- flag / approve / remove / ban
  reason TEXT DEFAULT '',
  created_at INTEGER NOT NULL,
  FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS search_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  query TEXT NOT NULL,
  result_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS access_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_id INTEGER NOT NULL,
  user_id INTEGER,
  ip TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS hot_searches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query TEXT UNIQUE NOT NULL,
  count INTEGER DEFAULT 1,
  updated_at INTEGER NOT NULL
);
`);

// 预置管理员账号 admin / admin123
const bcrypt = require('bcryptjs');
const adminExists = db.prepare('SELECT id FROM users WHERE account = ?').get('admin');
if (!adminExists) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare(`INSERT INTO users (account, password, nickname, role, created_at) VALUES (?,?,?,?,?)`)
    .run('admin', hash, '超级管理员', 'admin', Date.now());
}

module.exports = db;

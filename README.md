# 🦢 SWAN 私有搜索引擎

> 完全自主可控、用户自建网页、私有协议（swan://）、封闭生态的搜索引擎。  
> 对标百度/360/搜狗全套功能，前后端完整、云端运行、多设备全网同步。

---

## ✨ 核心特性

| 模块 | 功能 |
|------|------|
| **私有协议** | `swan://唯一ID` 私有网址，仅 SWAN 内部可打开，外部浏览器/微信完全无效 |
| **网页上传** | 粘贴 HTML 源码 → 自动清洗（过滤危险脚本）→ 提取标题/简介/关键词 → 立即上线入库 |
| **搜索引擎** | 中文分词（bigram）+ 倒排索引 + TF-IDF 排序；模糊搜索、智能纠错、联想搜索、热门榜 |
| **用户系统** | 手机号/邮箱 + 密码注册登录（无需验证码）；独立后台；多设备云端同步 |
| **审核机制** | 先发布 → AI 异步初审标记可疑 → 人工终审（放行/下架/封禁）；AI 无权永久删除 |
| **管理后台** | 全站统计、用户管理、网页列表、待复核清单、审核日志 |
| **数据云端** | 所有数据存云端数据库，同账号任意设备登录完全同步 |

---

## 🚀 快速开始（本地）

```bash
npm install
node server.js
```

打开浏览器访问 `http://localhost:3000`

**默认管理员账号：** `admin` / `admin123`（首次启动自动创建，请及时修改密码）

---

## ☁️ 云端部署（让所有设备、所有用户都能访问）

### 方案一：云服务器一键部署（推荐）

1. 购买一台云服务器（阿里云/腾讯云/华为云/UCloud 等，最低配即可），系统选 **Ubuntu 22.04**
2. 把本项目所有文件上传到服务器（`scp` 或 Git 克隆）
3. 执行一键部署：

```bash
chmod +x deploy.sh
sudo ./deploy.sh
```

4. **放行端口**：在云服务器控制台「安全组/防火墙」中放行 **TCP 3000** 端口
5. 访问：`http://你的服务器公网IP:3000` —— 此时全球任何设备都能访问

### 方案二：绑定域名 + HTTPS（推荐正式使用）

1. 购买域名并解析到服务器公网 IP
2. 安装 Nginx：

```bash
sudo apt install -y nginx
```

3. 配置反向代理 `/etc/nginx/sites-available/swan`：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

4. 启用并申请免费 HTTPS：

```bash
sudo ln -s /etc/nginx/sites-available/swan /etc/nginx/sites-enabled/
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
sudo nginx -t && sudo systemctl reload nginx
```

5. 访问 `https://your-domain.com` —— 全球可访问、HTTPS 加密

### 方案三：Docker 部署

```bash
# Dockerfile 已内置（如需可自行创建）
docker build -t swan .
docker run -d -p 3000:3000 -v $(pwd)/swan_cloud.db:/app/swan_cloud.db swan
```

---

## 📁 项目结构

```
swan-search-engine/
├── server.js          # 后端主服务（Express，所有 API）
├── db.js              # 云端数据库（SQLite，可切换 PostgreSQL）
├── search.js          # 搜索引擎核心（分词/倒排索引/TF-IDF）
├── moderation.js      # 内容审核（AI初审 + 人工终审）
├── package.json
├── deploy.sh          # 一键部署脚本
├── public/
│   ├── index.html     # 前端 SPA
│   ├── app.js         # 前端逻辑
│   └── style.css      # 毛玻璃 UI 样式
└── swan_cloud.db      # 云端数据库（自动生成）
```

---

## 🗄️ 数据库结构

| 表 | 说明 |
|----|------|
| `users` | 用户账号、密码（bcrypt 加密）、角色 |
| `pages` | 网页 HTML 源码、swan_id、标题、状态、可见性、权重、浏览量 |
| `search_index` | 搜索倒排索引（token、TF、字段权重） |
| `review_logs` | 审核记录（AI/管理员操作日志） |
| `search_logs` | 搜索日志 |
| `access_logs` | 网页访问日志 |
| `hot_searches` | 热门搜索词 |

> 默认用 SQLite（零配置、单文件、自动同步）。如需高并发生产，可将 `db.js` 中的 `better-sqlite3` 替换为 PostgreSQL/MySQL，表结构无需改动。

---

## 🔌 API 接口

### 认证
- `POST /api/auth/register` — 注册（account, password, nickname）
- `POST /api/auth/login` — 登录
- `GET  /api/auth/me` — 当前用户

### 网页
- `POST /api/pages` — 上传网页（html, title, custom_id, visibility）
- `GET  /api/pages/mine` — 我的网页列表
- `PUT  /api/pages/:id` — 编辑网页
- `DELETE /api/pages/:id` — 删除网页
- `GET  /api/pages/by-swan/:swanId` — 通过 swan:// 打开网页
- `GET  /api/pages/:id/snapshot` — 网页快照

### 搜索
- `GET /api/search?q=&sort=&page=` — 搜索（sort: relevance/views/newest）
- `GET /api/search/suggest?q=` — 联想搜索
- `GET /api/search/hot` — 热门搜索
- `GET /api/search/history` — 我的搜索历史

### 管理员（需 admin 角色）
- `GET /api/admin/stats` — 全站统计
- `GET /api/admin/users` — 用户列表
- `GET /api/admin/pages` — 全部网页
- `GET /api/admin/review/pending` — 待复核清单
- `POST /api/admin/review/:pageId` — 终审（action: approve/remove/ban）
- `GET /api/admin/review/logs` — 审核日志

---

## ⚠️ 重要说明

### 关于 `swan://` 私有协议
`swan://` 是 SWAN 应用**内部的私有路由协议**：在 SWAN 网页/客户端内点击 `swan://xxx` 会由内部浏览器打开；微信、外部浏览器、百度等**无法识别、无法打开**该链接。

> 严格的操作系统级协议注册（让 `swan://` 在系统任意位置只能被 SWAN 打开）需要配合**原生桌面/移动客户端**（Electron/App）实现 URL Scheme 注册。本 Web 版本已在应用层实现「仅本软件内部可解析」的封闭效果。如需 OS 级协议独占，可基于本项目后端封装 Electron 客户端注册 `swan://` 协议。

### 关于「禁止外网抓取」
本搜索引擎**只检索平台内用户上传的网页**，不调用任何第三方搜索接口、不爬取外网，完全独立私有生态。

### 关于数据云端同步
所有数据存储在云端服务器数据库，用户凭账号登录，任意设备访问同一云端服务即实现全网同步。

---

## 🔒 安全机制
- 密码 bcrypt 加盐哈希存储
- JWT 鉴权（30 天有效期）
- 上传 HTML 经 `sanitize-html` 白名单清洗，过滤 `<script>`、`onerror`、`javascript:` 等危险代码
- 管理员接口双重鉴权（登录 + admin 角色）
- 下架/封禁的 swan:// 链接永久返回 410 失效

---

## 📝 责任声明（已内置）
用户上传内容全部由上传者本人承担全部法律责任。平台实行「先发布、AI初审、人工终审」机制。在管理员未人工审核完成前出现的违规内容，一切责任归属上传者本人，与平台无关。上传前需强制勾选同意。

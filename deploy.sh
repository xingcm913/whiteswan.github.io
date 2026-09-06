#!/bin/bash
# SWAN 私有搜索引擎 — 一键部署脚本（Ubuntu/Debian 云服务器）
# 用法：chmod +x deploy.sh && sudo ./deploy.sh

set -e

echo "🦢 SWAN 私有搜索引擎部署开始..."

# 1. 安装 Node.js 18+
if ! command -v node &> /dev/null; then
  echo "📦 安装 Node.js..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

# 2. 安装依赖
echo "📦 安装项目依赖..."
npm install --production

# 3. 安装 PM2 进程守护
if ! command -v pm2 &> /dev/null; then
  npm install -g pm2
fi

# 4. 启动服务
echo "🚀 启动 SWAN 服务..."
pm2 delete swan 2>/dev/null || true
PORT=3000 pm2 start server.js --name swan
pm2 save
pm2 startup

echo ""
echo "✅ SWAN 已启动！"
echo "   本地访问: http://localhost:3000"
echo "   管理员账号: admin / admin123"
echo ""
echo "🌐 如需外网访问，请："
echo "   1. 放行云服务器安全组 3000 端口"
echo "   2. 或配置 Nginx 反向代理（见 README.md）"
echo "   3. 绑定域名并申请 HTTPS 证书"
echo ""
echo "📊 查看日志: pm2 logs swan"
echo "🛑 停止服务: pm2 stop swan"

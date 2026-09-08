#!/usr/bin/env bash
# AI 助手启动脚本
set -e

cd "$(dirname "$0")"

# 1. 创建虚拟环境（首次）
if [ ! -d ".venv" ]; then
  echo "[1/3] 创建虚拟环境..."
  python3 -m venv .venv
fi

# 2. 安装依赖
echo "[2/3] 检查依赖..."
.venv/bin/pip install -q -r requirements.txt

# 3. 启动
echo "[3/3] 启动服务..."
HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-8000}"
echo "访问地址：http://localhost:${PORT}  (局域网用本机 IP)"
exec .venv/bin/uvicorn app.main:app --host "$HOST" --port "$PORT"

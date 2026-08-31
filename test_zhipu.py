"""
智谱（BigModel / GLM）API 连通性测试脚本
--------------------------------------------
对应前端配置的默认值：
  API 接口地址：https://open.bigmodel.cn/api/paas/v4/chat/completions
  模型：         glm-4-flash

使用方法：
  方法一（推荐，一次性）：
    直接把下面的 api_key 变量改成你自己的 sk-xxxx，然后运行：
      python3 test_zhipu.py

  方法二（环境变量，更安全）：
    export ZHIPU_API_KEY="你的 sk-xxxx"
    python3 test_zhipu.py

依赖安装（如果没装）：
    pip3 install openai
"""
from openai import OpenAI
import os
import sys

# ====== 在这里填入你的智谱 API Key（或者用环境变量 ZHIPU_API_KEY） ======
api_key = ""  # 例："sk-xxxxxxxxxxxxxxxxxxxxxxxx"
# =====================================================================

api_key = api_key or os.environ.get("ZHIPU_API_KEY", "")

if not api_key:
    print("❌ 请先在脚本顶部或环境变量 ZHIPU_API_KEY 中填入你的 API Key")
    print("   获取地址：https://open.bigmodel.cn/usercenter/apikeys")
    sys.exit(1)

# 1:1 对应你贴出的官方 SDK 用法
client = OpenAI(
    api_key=api_key,
    base_url="https://open.bigmodel.cn/api/paas/v4/",
)

print("\n" + "=" * 60)
print("  🧪 智谱 API 连通性测试")
print("  📡 base_url : https://open.bigmodel.cn/api/paas/v4/")
print("  🤖 模型     : glm-4-flash")
print("  🔑 API Key  :", api_key[:5] + "..." + api_key[-4:] if len(api_key) > 10 else "已设置")
print("=" * 60 + "\n")

try:
    print("⏳ 正在发送测试请求（\"测试消息\"）...\n")
    resp = client.chat.completions.create(
        model="glm-4-flash",
        messages=[{"role": "user", "content": "测试消息"}],
        temperature=0.7,
    )
    content = resp.choices[0].message.content
    usage = getattr(resp, "usage", None)

    print("✅ 请求成功！")
    print("   model       :", getattr(resp, "model", "-"))
    print("   finish_reason:", resp.choices[0].finish_reason)
    if usage:
        print("   prompt_tokens :", usage.prompt_tokens)
        print("   completion_tok:", usage.completion_tokens)
        print("   total_tokens  :", usage.total_tokens)
    print("\n" + "-" * 60)
    print("🤖 AI 回复内容：\n")
    print(content)
    print("-" * 60 + "\n")

except Exception as e:
    err_type = type(e).__name__
    print(f"❌ 调用失败：{err_type}: {e}")
    print("\n常见原因：")
    print("  • API Key 错误 / 不存在 → 去 https://open.bigmodel.cn/usercenter/apikeys 新建一个")
    print("  • 账户已欠费 / 额度不足  → 去控制台查看余额")
    print("  • 模型名称拼写错误       → 确认模型名称是否在控制台的可用模型列表中")
    print("  • 网络/代理问题         → 检查能否直接访问 https://open.bigmodel.cn")
    sys.exit(2)

"""对接 OpenAI 兼容接口的 LLM 调用层。

支持任何兼容 OpenAI Chat Completions 协议的服务：
- 智谱 GLM: https://open.bigmodel.cn/api/paas/v4/
- DeepSeek:  https://api.deepseek.com/v1/
- 通义千问:  https://dashscope.aliyuncs.com/compatible-mode/v1/
- OpenAI:    https://api.openai.com/v1/
- 本地 Ollama: http://localhost:11434/v1/
"""
from __future__ import annotations

import json
from typing import Any, Iterator

import httpx

from . import database as db
from . import time_util


class LLMError(RuntimeError):
    """LLM 调用异常。"""


def _build_messages(
    user_input: str,
    *,
    override_system: str | None = None,
    history: list[dict[str, str]] | None = None,
    use_training: bool = True,
    inject_time: bool = True,
) -> list[dict[str, str]]:
    """组装发送给模型的 messages 数组。"""
    messages: list[dict[str, str]] = []

    # 系统提示
    sys_parts: list[str] = []
    if override_system is not None:
        sys_parts.append(override_system)
    else:
        sys_parts.append(db.get_setting("system_prompt", "你是一个乐于助人的中文 AI 助手。"))

    if inject_time:
        sys_parts.append(time_util.system_time_prompt())

    if use_training:
        samples = db.list_training_samples()
        if samples:
            block_lines = ["【训练样本（请遵循这些风格与规则）】"]
            for s in samples:
                block_lines.append(f"[{s['role']}] {s['content']}")
            sys_parts.append("\n".join(block_lines))

    messages.append({"role": "system", "content": "\n\n".join(sys_parts)})

    # 历史
    if history:
        messages.extend(history)

    # 当前输入
    messages.append({"role": "user", "content": user_input})
    return messages


def _resolve_params(overrides: dict[str, Any] | None = None) -> dict[str, Any]:
    overrides = overrides or {}
    params: dict[str, Any] = {
        "model": overrides.get("model") or db.get_setting("model"),
        "temperature": float(overrides.get("temperature", db.get_setting("temperature", "0.7"))),
        "top_p": float(overrides.get("top_p", db.get_setting("top_p", "0.9"))),
        "max_tokens": int(overrides.get("max_tokens", db.get_setting("max_tokens", "2048"))),
        "presence_penalty": float(overrides.get("presence_penalty", db.get_setting("presence_penalty", "0"))),
        "frequency_penalty": float(overrides.get("frequency_penalty", db.get_setting("frequency_penalty", "0"))),
    }
    return params


def chat(
    user_input: str,
    *,
    history: list[dict[str, str]] | None = None,
    overrides: dict[str, Any] | None = None,
    use_training: bool | None = None,
    inject_time: bool | None = None,
) -> str:
    """非流式对话。"""
    settings = db.get_settings()
    base_url = overrides.get("base_url") if overrides else None
    base_url = base_url or settings.get("base_url", "")
    api_key = overrides.get("api_key") if overrides else None
    api_key = api_key or settings.get("api_key", "")
    if not api_key:
        raise LLMError("尚未配置上游模型 API Key，请在右上角『设置』中填写。")

    if use_training is None:
        use_training = db.get_setting("use_training", "1") == "1"
    if inject_time is None:
        inject_time = db.get_setting("inject_time", "1") == "1"

    params = _resolve_params(overrides)
    messages = _build_messages(
        user_input,
        override_system=overrides.get("system_prompt") if overrides else None,
        history=history,
        use_training=use_training,
        inject_time=inject_time,
    )
    url = base_url.rstrip("/") + "/chat/completions"
    payload = {"stream": False, "messages": messages, **params}
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

    try:
        with httpx.Client(timeout=120.0) as client:
            resp = client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPStatusError as e:
        raise LLMError(f"上游模型返回错误 {e.response.status_code}: {e.response.text[:500]}") from e
    except httpx.RequestError as e:
        raise LLMError(f"网络请求失败: {e}") from e

    try:
        return data["choices"][0]["message"]["content"]
    except (KeyError, IndexError) as e:
        raise LLMError(f"无法解析模型响应: {data}") from e


def chat_stream(
    user_input: str,
    *,
    history: list[dict[str, str]] | None = None,
    overrides: dict[str, Any] | None = None,
    use_training: bool | None = None,
    inject_time: bool | None = None,
) -> Iterator[str]:
    """流式对话，按 SSE 行产出 delta 文本。"""
    settings = db.get_settings()
    base_url = (overrides.get("base_url") if overrides else None) or settings.get("base_url", "")
    api_key = (overrides.get("api_key") if overrides else None) or settings.get("api_key", "")
    if not api_key:
        raise LLMError("尚未配置上游模型 API Key，请在右上角『设置』中填写。")

    if use_training is None:
        use_training = db.get_setting("use_training", "1") == "1"
    if inject_time is None:
        inject_time = db.get_setting("inject_time", "1") == "1"

    params = _resolve_params(overrides)
    messages = _build_messages(
        user_input,
        override_system=overrides.get("system_prompt") if overrides else None,
        history=history,
        use_training=use_training,
        inject_time=inject_time,
    )
    url = base_url.rstrip("/") + "/chat/completions"
    payload = {"stream": True, "messages": messages, **params}
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

    try:
        with httpx.Client(timeout=None, read_timeout=300.0) as client:
            with client.stream("POST", url, json=payload, headers=headers) as resp:
                if resp.status_code >= 400:
                    body = resp.read().decode("utf-8", errors="replace")
                    raise LLMError(f"上游返回错误 {resp.status_code}: {body[:500]}")
                for line in resp.iter_lines():
                    if not line:
                        continue
                    if line.startswith("data: "):
                        chunk = line[6:]
                    elif line.startswith("data:"):
                        chunk = line[5:]
                    else:
                        continue
                    chunk = chunk.strip()
                    if chunk == "[DONE]":
                        break
                    try:
                        obj = json.loads(chunk)
                    except json.JSONDecodeError:
                        continue
                    try:
                        delta = obj["choices"][0]["delta"].get("content")
                    except (KeyError, IndexError):
                        delta = None
                    if delta:
                        yield delta
    except httpx.RequestError as e:
        raise LLMError(f"网络请求失败: {e}") from e

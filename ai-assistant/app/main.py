"""FastAPI 主入口：Web 界面 + 对外 API 接口。

启动：python -m app.main  或  uvicorn app.main:app --host 0.0.0.0 --port 8000
"""
from __future__ import annotations

import json
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from . import database as db
from . import llm
from . import time_util

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"

app = FastAPI(title="AI 助手", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
    db.init_db()


# ---------- 静态页面 ----------
@app.get("/")
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


# =================================================================
# 内部管理 API（前端用）
# =================================================================
@app.get("/api/settings")
def api_get_settings() -> dict:
    return db.get_settings()


@app.put("/api/settings")
def api_set_settings(body: dict) -> dict:
    for k, v in body.items():
        db.set_setting(k, str(v))
    return {"ok": True}


@app.get("/api/presets")
def api_list_presets() -> list:
    return db.list_presets()


@app.post("/api/presets")
def api_create_preset(body: dict) -> dict:
    return db.create_preset(body)


@app.delete("/api/presets/{pid}")
def api_delete_preset(pid: int) -> dict:
    return {"ok": db.delete_preset(pid)}


@app.get("/api/keys")
def api_list_keys() -> list:
    return db.list_api_keys()


class CreateKeyIn(BaseModel):
    name: str = ""


@app.post("/api/keys")
def api_create_key(body: CreateKeyIn) -> dict:
    return db.create_api_key(body.name)


@app.delete("/api/keys/{kid}")
def api_delete_key(kid: int) -> dict:
    return {"ok": db.delete_api_key(kid)}


class ToggleKeyIn(BaseModel):
    active: bool


@app.patch("/api/keys/{kid}")
def api_toggle_key(kid: int, body: ToggleKeyIn) -> dict:
    return {"ok": db.toggle_api_key(kid, body.active)}


@app.get("/api/training")
def api_list_training(tag: str = "") -> list:
    return db.list_training_samples(tag)


@app.get("/api/training/tags")
def api_training_tags() -> list:
    return db.training_tags()


class TrainingIn(BaseModel):
    role: str = Field(..., description="system / user / assistant")
    content: str
    tag: str = ""


@app.post("/api/training")
def api_add_training(body: TrainingIn) -> dict:
    try:
        return db.add_training_sample(body.role, body.content, body.tag)
    except ValueError as e:
        raise HTTPException(400, str(e))


@app.delete("/api/training/{tid}")
def api_del_training(tid: int) -> dict:
    return {"ok": db.delete_training_sample(tid)}


@app.get("/api/conversations")
def api_list_conv() -> list:
    return db.list_conversations()


@app.delete("/api/conversations")
def api_clear_conv() -> dict:
    db.clear_conversations()
    return {"ok": True}


# =================================================================
# 内部对话接口（前端用，带历史）
# =================================================================
class ChatIn(BaseModel):
    input: str
    history: list[dict] = []
    overrides: dict = {}
    use_training: bool | None = None
    inject_time: bool | None = None


@app.post("/api/chat")
def api_chat(body: ChatIn) -> dict:
    try:
        answer = llm.chat(
            body.input,
            history=body.history,
            overrides=body.overrides,
            use_training=body.use_training,
            inject_time=body.inject_time,
        )
    except llm.LLMError as e:
        raise HTTPException(502, str(e))
    db.log_message("user", body.input)
    db.log_message("assistant", answer)
    return {"answer": answer, "time": time_util.now_iso()}


@app.post("/api/chat/stream")
def api_chat_stream(body: ChatIn) -> StreamingResponse:
    """SSE 流式对话。"""
    def gen():
        buf: list[str] = []
        try:
            for chunk in llm.chat_stream(
                body.input,
                history=body.history,
                overrides=body.overrides,
                use_training=body.use_training,
                inject_time=body.inject_time,
            ):
                buf.append(chunk)
                yield f"data: {json.dumps({'delta': chunk})}\n\n"
            yield f"data: {json.dumps({'done': True, 'time': time_util.now_iso()})}\n\n"
        except llm.LLMError as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        full = "".join(buf)
        if full:
            db.log_message("user", body.input)
            db.log_message("assistant", full)

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# =================================================================
# 对外 API（外部软件用 API Key 调用）
# =================================================================
def _require_key(authorization: str | None) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "缺少 Authorization Bearer 头")
    raw = authorization.split(" ", 1)[1].strip()
    info = db.validate_api_key(raw)
    if not info:
        raise HTTPException(401, "无效或已停用的 API Key")
    return info


class PublicChatIn(BaseModel):
    model: str | None = None
    messages: list[dict]
    temperature: float | None = None
    top_p: float | None = None
    max_tokens: int | None = None
    presence_penalty: float | None = None
    frequency_penalty: float | None = None
    stream: bool = False
    system: str | None = None
    use_training: bool = True
    inject_time: bool = True


@app.post("/v1/chat/completions", response_model=None)
def public_chat(
    body: PublicChatIn,
    authorization: str | None = Header(default=None),
) -> StreamingResponse | dict:
    """OpenAI 兼容的对外接口。外部软件填好 base_url 与 api_key 即可调用。

    base_url: http://<你的服务器>:8000/v1
    api_key:  在『API Key 管理』页面创建
    """
    _require_key(authorization)

    # 取最后一条 user 消息作为输入
    user_msgs = [m for m in body.messages if m.get("role") == "user"]
    if not user_msgs:
        raise HTTPException(400, "messages 中至少要有一条 user 消息")
    user_input = user_msgs[-1]["content"]
    history = [
        {"role": m["role"], "content": m["content"]}
        for m in body.messages
        if m.get("role") in ("user", "assistant")
    ][:-1]  # 去掉最后一条已作为 user_input

    overrides = {
        k: v for k, v in {
            "model": body.model,
            "temperature": body.temperature,
            "top_p": body.top_p,
            "max_tokens": body.max_tokens,
            "presence_penalty": body.presence_penalty,
            "frequency_penalty": body.frequency_penalty,
            "system_prompt": body.system,
        }.items() if v is not None
    }

    if body.stream:
        def gen():
            for chunk in llm.chat_stream(
                user_input,
                history=history,
                overrides=overrides,
                use_training=body.use_training,
                inject_time=body.inject_time,
            ):
                payload = {
                    "choices": [{"delta": {"content": chunk}, "index": 0}],
                }
                yield f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"
            yield "data: [DONE]\n\n"
        return StreamingResponse(
            gen(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache"},
        )

    answer = llm.chat(
        user_input,
        history=history,
        overrides=overrides,
        use_training=body.use_training,
        inject_time=body.inject_time,
    )
    return {
        "id": f"chatcmpl-{body.model or 'assistant'}",
        "object": "chat.completion",
        "model": body.model or db.get_setting("model"),
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": answer},
                "finish_reason": "stop",
            }
        ],
        "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
    }


@app.get("/v1/models")
def public_models(authorization: str | None = Header(default=None)) -> dict:
    """对外暴露的模型列表。"""
    _require_key(authorization)
    default = db.get_setting("model", "assistant")
    return {
        "object": "list",
        "data": [{"id": default, "object": "model", "owned_by": "assistant"}],
    }


@app.get("/health")
def health() -> dict:
    return {"ok": True, "time": time_util.now_iso()}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=False)

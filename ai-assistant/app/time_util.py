"""系统时间工具：保证 AI 知道当前真实时间。"""
from datetime import datetime, timezone, timedelta

# 东八区（北京时间），可按需调整
CN_TZ = timezone(timedelta(hours=8))


def now() -> datetime:
    """返回带时区的当前时间。"""
    return datetime.now(CN_TZ)


def now_str() -> str:
    """返回人类可读的当前时间字符串，含星期。"""
    return now().strftime("%Y年%m月%d日 %H时%M分%S秒 %A")


def now_iso() -> str:
    """返回 ISO 格式当前时间。"""
    return now().isoformat(timespec="seconds")


def system_time_prompt() -> str:
    """构造注入到系统提示词中的时间信息块。"""
    return (
        f"【系统当前时间】{now_str()}（{now_iso()}）。\n"
        "请始终以这个时间为准回答任何关于\"现在\"、\"今天\"、\"今年\"、"
        "\"几几年\"、\"几月几日\"、\"星期几\"的问题，不要使用训练数据里的旧时间。"
    )

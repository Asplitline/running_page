"""refresh token 轮换观测 — 用于判定「滑动过期 or 绝对过期」。

背景:佳明 refresh token 是不透明串,库的 dumps() 又丢掉了服务端返回的
refresh_token_expires_in,所以无法直接读出剩余寿命。退而记录轮换史:

  - 每次同步记下当前串的指纹与首见/末见时间
  - 若某串沿用约 30 天后同步报 401 → 绝对过期(每月必须手动重登)
  - 若串持续轮换且从不报 401 → 滑动过期(可长期免登录)

只存 SHA-256 前 12 位指纹,绝不落 token 原文 —— refresh token 等价于密码。
观测失败一律不阻断同步:这是诊断辅助,不是主流程。
"""

import hashlib
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

CN_TZ = timezone(timedelta(hours=8))
_MAX_ENTRIES = 30  # 只留最近 30 次轮换,避免文件无限增长


def _fingerprint(token):
    """指纹化:够区分不同串,又不泄露原文。"""
    return hashlib.sha256(token.encode()).hexdigest()[:12]


def _load(path):
    try:
        data = json.loads(Path(path).read_text())
        if isinstance(data, dict) and isinstance(data.get("rotations"), list):
            return data
    except Exception:
        pass  # 文件缺失或损坏都从空历史重建
    return {"rotations": []}


def record_rotation(path, refresh_token, now=None):
    """记录本次看到的 refresh token。串未变则只更新 last_seen。"""
    if not refresh_token:
        return
    now = now or datetime.now(tz=CN_TZ).isoformat(timespec="seconds")
    fp = _fingerprint(refresh_token)
    data = _load(path)
    rotations = data["rotations"]

    if rotations and rotations[-1].get("fingerprint") == fp:
        rotations[-1]["last_seen"] = now
    else:
        rotations.append({"fingerprint": fp, "first_seen": now, "last_seen": now})
        del rotations[:-_MAX_ENTRIES]

    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, indent=2, ensure_ascii=False))


def summarize(path):
    """人话摘要,打进 CI 日志。指纹也不打印,只给年龄和轮换次数。"""
    data = _load(path)
    rotations = data["rotations"]
    if not rotations:
        return "[token 观测] 暂无轮换记录(首次运行)"

    current = rotations[-1]
    try:
        first = datetime.fromisoformat(current["first_seen"])
        last = datetime.fromisoformat(current["last_seen"])
        age_days = (last - first).days
    except Exception:
        return f"[token 观测] 已记录 {len(rotations)} 次轮换(时间解析失败)"

    lines = [
        f"[token 观测] 当前 refresh token 已使用 {age_days} 天,"
        f"历史累计轮换 {len(rotations)} 次"
    ]
    if age_days >= 25:
        lines.append(
            "  ⚠️ 已接近 30 天(社区观测到的 refresh token 寿命),"
            "若下次同步报 401 则说明是绝对过期,需重跑 make_secret"
        )
    if len(rotations) == 1 and age_days >= 3:
        lines.append("  ℹ️ 多日未轮换:服务端可能未下发新串,或 checkpoint 未生效")
    return "\n".join(lines)

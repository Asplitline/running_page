"""token 轮换观测的契约。

用途:回答「refresh token 是滑动过期还是绝对过期」——
库丢掉了服务端的 refresh_token_expires_in,只能靠自己记录轮换史来反推。
  - 每次跑都换新串 → 观察某串能活多久
  - 首串沿用 30 天后失效 → 绝对过期
  - 一直轮换从不失效 → 滑动过期
只记录指纹(hash 前 12 位),绝不落 token 原文。
"""

import json

from backend.sync_garmin.token_audit import record_rotation, summarize


def test_record_creates_history_on_first_run(tmp_path):
    audit = tmp_path / "audit.json"

    record_rotation(audit, "refresh-A", now="2026-08-25T00:00:00+08:00")

    data = json.loads(audit.read_text())
    assert len(data["rotations"]) == 1
    assert data["rotations"][0]["first_seen"] == "2026-08-25T00:00:00+08:00"


def test_record_never_stores_raw_token(tmp_path):
    audit = tmp_path / "audit.json"

    record_rotation(audit, "super-secret-refresh", now="2026-08-25T00:00:00+08:00")

    assert "super-secret-refresh" not in audit.read_text()


def test_same_token_updates_last_seen_not_new_entry(tmp_path):
    """串没变 → 不新增记录,只更新 last_seen(说明服务端这次没轮换)。"""
    audit = tmp_path / "audit.json"
    record_rotation(audit, "refresh-A", now="2026-08-25T00:00:00+08:00")

    record_rotation(audit, "refresh-A", now="2026-08-26T00:00:00+08:00")

    data = json.loads(audit.read_text())
    assert len(data["rotations"]) == 1
    assert data["rotations"][0]["last_seen"] == "2026-08-26T00:00:00+08:00"


def test_new_token_appends_entry(tmp_path):
    audit = tmp_path / "audit.json"
    record_rotation(audit, "refresh-A", now="2026-08-25T00:00:00+08:00")

    record_rotation(audit, "refresh-B", now="2026-08-26T00:00:00+08:00")

    data = json.loads(audit.read_text())
    assert len(data["rotations"]) == 2


def test_summarize_reports_current_token_age(tmp_path):
    """摘要要能一眼看出当前串用了多久 —— 这是判定过期模式的依据。"""
    audit = tmp_path / "audit.json"
    record_rotation(audit, "refresh-A", now="2026-08-01T00:00:00+08:00")
    record_rotation(audit, "refresh-A", now="2026-08-25T00:00:00+08:00")

    text = summarize(audit)

    assert "24" in text  # 8/1 → 8/25 = 24 天
    assert "refresh-A" not in text


def test_summarize_handles_missing_file(tmp_path):
    """首次运行没有历史文件,不能炸。"""
    assert summarize(tmp_path / "absent.json")


def test_record_tolerates_corrupt_history(tmp_path):
    """历史文件坏了要能自愈,不能阻断同步。"""
    audit = tmp_path / "audit.json"
    audit.write_text("{ not json")

    record_rotation(audit, "refresh-A", now="2026-08-25T00:00:00+08:00")

    data = json.loads(audit.read_text())
    assert len(data["rotations"]) == 1

"""run_data_sync workflow 的静态约束。

保住三件容易在后续改动中被破坏的事:
  1. token 走文件模式(否则轮换值丢失,30 天后必挂)
  2. token 缓存无条件回存(否则同步失败时新 token 丢失,错误会一直重复)
  3. 数据提交走白名单且核验无 token 文件(否则 token 泄露进仓库)
"""

from pathlib import Path

import pytest
import yaml

WORKFLOW = Path(".github/workflows/run_data_sync.yml")


@pytest.fixture(scope="module")
def sync_steps():
    data = yaml.safe_load(WORKFLOW.read_text())
    return data["jobs"]["sync"]["steps"]


def _step(steps, name):
    for st in steps:
        if st.get("name") == name:
            return st
    raise AssertionError(f"步骤不存在: {name}")


def test_sync_uses_tokenstore_file_mode(sync_steps):
    """必须传 --tokenstore;走位置参数串会绕开库的回写逻辑。"""
    run = _step(sync_steps, "Run sync Garmin CN script")["run"]

    assert "--tokenstore" in run
    assert "GARMIN_SECRET_STRING_CN" not in run


def test_token_cache_restored_before_sync(sync_steps):
    """恢复必须在同步之前,否则拿不到上次轮换的 token。"""
    names = [st.get("name") for st in sync_steps]

    assert names.index("Restore Garmin token cache") < names.index(
        "Run sync Garmin CN script"
    )


def test_token_cache_saved_unconditionally(sync_steps):
    """同步失败也要回存 —— 刷新出的新 token 不能丢,否则同一错误无限重复。"""
    save = _step(sync_steps, "Save Garmin token cache")

    assert save["if"] == "always()"
    assert save["with"]["path"] == ".garmin_token"


def test_cache_key_is_unique_per_run(sync_steps):
    """GitHub 不覆盖已存在的 cache key,必须带 run_id 保证唯一。"""
    save = _step(sync_steps, "Save Garmin token cache")
    restore = _step(sync_steps, "Restore Garmin token cache")

    assert "github.run_id" in save["with"]["key"]
    # 恢复靠前缀回退到最近一份
    assert "restore-keys" in restore["with"]


def test_bootstrap_fails_loudly_without_any_credential(sync_steps):
    """无缓存又无 Secret 时必须明确失败,不能静默跑到同步阶段才报错。"""
    run = _step(sync_steps, "Bootstrap token file from secret")["run"]

    assert "::error::" in run
    assert "exit 1" in run


def test_push_uses_explicit_allowlist(sync_steps):
    """禁止 git add . —— token 目录一旦被 gitignore 遗漏就会泄露。"""
    run = _step(sync_steps, "Push new runs")["run"]
    # 只看实际命令,注释里出现 "git add ." 是在解释为何不用它
    commands = [
        ln.strip()
        for ln in run.splitlines()
        if ln.strip() and not ln.strip().startswith("#")
    ]

    assert not any(c.startswith("git add .") for c in commands)
    assert any("GPX_OUT" in c for c in commands)


def test_push_rejects_staged_token_files(sync_steps):
    """提交前核验暂存区无 token 文件,这是泄露的最后一道闸。"""
    run = _step(sync_steps, "Push new runs")["run"]

    assert "garmin_token" in run
    assert "拒绝提交" in run


def test_shell_steps_use_strict_mode(sync_steps):
    """凭据相关的 shell 必须 set -euo pipefail,避免静默继续。"""
    for name in ("Bootstrap token file from secret", "Push new runs"):
        assert "set -euo pipefail" in _step(sync_steps, name)["run"], name


def test_token_dir_is_gitignored():
    """gitignore 是防泄露的第一层。"""
    assert ".garmin_token/" in Path(".gitignore").read_text()

"""sync CLI 的 tokenstore 模式契约。

关键行为:业务失败也要 checkpoint —— 同步中途轮换出的新 refresh token
不能因为下载环节报错而丢掉,否则下次运行拿到的还是旧串。
"""

from unittest.mock import Mock

import pytest

from backend.sync_garmin import sync as sync_mod


class FakeClient:
    def __init__(self, persist_error=None):
        self.persist_calls = 0
        self._persist_error = persist_error

    def persist_tokenstore(self):
        self.persist_calls += 1
        if self._persist_error:
            raise self._persist_error


@pytest.fixture
def stub_pipeline(monkeypatch, tmp_path):
    """把落库/下载等重环节替换掉,只观察认证与 checkpoint 的编排。"""
    monkeypatch.setattr(sync_mod, "GPX_FOLDER", str(tmp_path / "gpx"))
    monkeypatch.setattr(
        sync_mod, "download_new_activities", Mock(return_value=([], {}))
    )
    monkeypatch.setattr(sync_mod, "make_activities_file", Mock())
    monkeypatch.setattr(sync_mod, "init_db", Mock())
    monkeypatch.setattr(sync_mod, "sync_daily_metrics", Mock())
    monkeypatch.setattr(sync_mod, "write_latest_daily_metrics_file", Mock())


def test_tokenstore_mode_checkpoints_on_success(monkeypatch, tmp_path, stub_pipeline):
    client = FakeClient()
    monkeypatch.setattr(
        sync_mod.GarminClient, "from_tokenstore", Mock(return_value=client)
    )

    sync_mod.run_sync(
        None, is_cn=True, is_only_running=False, tokenstore=tmp_path / "t.json"
    )

    assert client.persist_calls == 1


def test_business_failure_still_checkpoints(monkeypatch, tmp_path, stub_pipeline):
    """下载炸了也要把轮换后的 token 存下来,并且原始异常要照常抛出。"""
    client = FakeClient()
    monkeypatch.setattr(
        sync_mod.GarminClient, "from_tokenstore", Mock(return_value=client)
    )
    monkeypatch.setattr(
        sync_mod, "download_new_activities", Mock(side_effect=RuntimeError("boom"))
    )

    with pytest.raises(RuntimeError, match="boom"):
        sync_mod.run_sync(
            None, is_cn=True, is_only_running=False, tokenstore=tmp_path / "t.json"
        )

    assert client.persist_calls == 1


def test_checkpoint_failure_does_not_mask_business_error(
    monkeypatch, tmp_path, stub_pipeline
):
    """checkpoint 自己失败时,不能吞掉业务异常 —— 业务异常更重要。"""
    client = FakeClient(persist_error=OSError("disk full"))
    monkeypatch.setattr(
        sync_mod.GarminClient, "from_tokenstore", Mock(return_value=client)
    )
    monkeypatch.setattr(
        sync_mod, "download_new_activities", Mock(side_effect=RuntimeError("boom"))
    )

    with pytest.raises(RuntimeError, match="boom"):
        sync_mod.run_sync(
            None, is_cn=True, is_only_running=False, tokenstore=tmp_path / "t.json"
        )


def test_string_mode_still_works(monkeypatch, tmp_path, stub_pipeline):
    """向后兼容:传串时仍走 from_token,不需要 tokenstore。"""
    client = FakeClient()
    from_token = Mock(return_value=client)
    monkeypatch.setattr(sync_mod.GarminClient, "from_token", from_token)

    sync_mod.run_sync("{}", is_cn=True, is_only_running=False, tokenstore=None)

    assert from_token.called

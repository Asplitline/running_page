"""GarminClient.from_tokenstore 的契约测试。

核心诉求:让库自带的降级链真正生效 ——
  文件 token → 快过期则刷新并回写 → 文件坏/被拒则账密兜底 → 回写
当前 from_token(串) 走 loads(),绕开了整条链,轮换出的新 refresh token 进程退出即丢。
"""

import json
from pathlib import Path
from typing import ClassVar

import pytest

from backend.sync_garmin import auth as auth_mod
from backend.sync_garmin.auth import GarminAuthError, GarminClient

VALID_TOKEN = {
    "di_token": "access-old",
    "di_refresh_token": "refresh-old",
    "di_client_id": "client-1",
}


class FakeInner:
    """garminconnect 内层 client 的替身,只实现被调用到的部分。"""

    def __init__(self):
        self.di_token = VALID_TOKEN["di_token"]
        self.di_refresh_token = VALID_TOKEN["di_refresh_token"]
        self.di_client_id = VALID_TOKEN["di_client_id"]
        self.dump_calls = []

    def dumps(self):
        return json.dumps(
            {
                "di_token": self.di_token,
                "di_refresh_token": self.di_refresh_token,
                "di_client_id": self.di_client_id,
            }
        )

    def dump(self, path):
        self.dump_calls.append(path)
        Path(path).write_text(self.dumps())

    def loads(self, s):
        data = json.loads(s)
        self.di_token = data["di_token"]
        self.di_refresh_token = data["di_refresh_token"]
        self.di_client_id = data["di_client_id"]


class FakeGarmin:
    """Garmin 外层替身。login(tokenstore=) 的行为按库语义模拟。"""

    instances: ClassVar[list] = []

    def __init__(self, email=None, password=None, is_cn=False, prompt_mfa=None):
        self.email = email
        self.password = password
        self.is_cn = is_cn
        self.client = FakeInner()
        self.login_calls = []
        self.login_error = None
        FakeGarmin.instances.append(self)

    def login(self, tokenstore=None):
        self.login_calls.append(tokenstore)
        if self.login_error:
            raise self.login_error
        return True


@pytest.fixture(autouse=True)
def _reset_fake(monkeypatch):
    FakeGarmin.instances = []
    monkeypatch.setattr(auth_mod, "Garmin", FakeGarmin)
    yield


@pytest.fixture
def token_file(tmp_path):
    p = tmp_path / "garmin_tokens.json"
    p.write_text(json.dumps(VALID_TOKEN))
    return p


def test_from_tokenstore_passes_file_path_to_login(token_file):
    """必须走 login(tokenstore=路径),而非 loads(串) —— 这是回写生效的前提。"""
    client = GarminClient.from_tokenstore(token_file, is_cn=True)

    inner = FakeGarmin.instances[-1]
    assert inner.login_calls == [str(token_file)]
    assert inner.is_cn is True
    assert client is not None


def test_from_tokenstore_falls_back_to_credentials(tmp_path):
    """文件不存在时,若提供账密则降级登录,不应直接报错。"""
    missing = tmp_path / "absent.json"

    GarminClient.from_tokenstore(missing, is_cn=True, email="a@b.c", password="pw")

    inner = FakeGarmin.instances[-1]
    assert inner.email == "a@b.c"
    assert inner.password == "pw"


def test_from_tokenstore_without_credentials_raises_auth_error(tmp_path):
    """文件不存在且无账密 —— 无路可走,必须明确报错而不是静默继续。"""
    with pytest.raises(GarminAuthError):
        GarminClient.from_tokenstore(tmp_path / "absent.json", is_cn=True)


def test_persist_tokenstore_writes_current_tokens(token_file):
    """checkpoint:把内存里轮换后的最新 token 落盘。"""
    client = GarminClient.from_tokenstore(token_file, is_cn=True)
    inner = FakeGarmin.instances[-1]
    inner.client.di_refresh_token = "refresh-rotated"

    client.persist_tokenstore()

    saved = json.loads(token_file.read_text())
    assert saved["di_refresh_token"] == "refresh-rotated"


def test_persist_tokenstore_is_noop_without_path():
    """串模式(无文件路径)下 checkpoint 应安全跳过,不抛错。"""
    client = GarminClient.from_token(json.dumps(VALID_TOKEN), is_cn=True)
    client.persist_tokenstore()


def test_login_failure_surfaces_auth_error(tmp_path, monkeypatch):
    """库登录失败必须转成带指引的 GarminAuthError,不能让底层异常裸奔。"""

    class BoomGarmin(FakeGarmin):
        def login(self, tokenstore=None):
            raise RuntimeError("login blew up")

    monkeypatch.setattr(auth_mod, "Garmin", BoomGarmin)

    with pytest.raises(GarminAuthError) as caught:
        GarminClient.from_tokenstore(
            tmp_path / "absent.json", is_cn=True, email="a@b.c", password="pw"
        )
    # 底层原因要透出来,便于排查
    assert "login blew up" in str(caught.value)

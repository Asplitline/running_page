"""佳明认证封装 — 基于 python-garminconnect(garth 废弃后的继任库)。

把认证收敛成薄接口,隔离底层库的选择:
  - from_token: 用已导出的 token 串或 token 目录构造(日常同步走这条)
  - login_with_credentials: 账密登录,内部走 curl_cffi 绕 Cloudflare TLS 指纹

CN 区由 is_cn 开关控制,库内部切 garmin.cn,不再需要旧代码那种 ssl_verify=False 脏招。
"""

from pathlib import Path

from garminconnect import Garmin
from garminconnect.exceptions import GarminConnectAuthenticationError

# file_type -> 库下载枚举
DOWNLOAD_FORMATS = {
    "gpx": Garmin.ActivityDownloadFormat.GPX,
}

# 认证失败时的可读指引,替代满屏底层 traceback
_AUTH_HINT = (
    "佳明认证失败(401)。三种成因修法不同,先判定再动手:\n"
    "  判定方法:用同一份 token 在本地(国内 IP)重放一次,\n"
    "    本地能过 → 是 runner IP 被风控;本地也 401 → token 确实失效。\n"
    "  1. refresh token 失效 —— 重新生成: "
    "uv run python -m backend.sync_garmin.make_secret <邮箱> <密码> --is-cn\n"
    "     CI 只需更新 Secret GARMIN_SECRET_STRING_CN,缓存会自动按指纹失效\n"
    "     (社区称约 30 天寿命,但实测有 13 天即失效的情况,不能靠天数排除)\n"
    "  2. 依赖版本漂移 —— CI 应走 uv sync --frozen(锁定 curl_cffi 等),避免新版 TLS 指纹触发 CN 风控\n"
    "  3. 异地 IP 被风控 —— GitHub runner 境外共享 IP 常被佳明 CN 拦截"
)

# 无 token 文件又无账密时的指引:两条路都断了,必须人工介入
_NO_CREDENTIAL_HINT = (
    "无可用凭据:token 文件不存在且未提供账号密码。\n"
    "  - CI 场景:检查 GARMIN_SECRET_STRING_CN 是否配置(用于首次 bootstrap 写出 token 文件)\n"
    "  - 本地场景:先跑 make_secret 生成 token,或传入 --email/--password"
)


class GarminAuthError(RuntimeError):
    """认证失败的可读封装,携带排查指引。"""


class GarminClient:
    """python-garminconnect 的薄封装,只暴露同步所需的能力。"""

    def __init__(self, client: Garmin, is_only_running=False, tokenstore_path=None):
        self._client = client
        self.is_only_running = is_only_running
        # 文件模式下记住路径,供 persist_tokenstore 做退出前 checkpoint;
        # 串模式为 None,checkpoint 静默跳过。
        self._tokenstore_path = tokenstore_path

    @classmethod
    def from_token(cls, token, is_cn=False, is_only_running=False):
        """用已有 token 串构造。token 是 make_secret 产出的 dumps() JSON 串。

        直接走内层 client.loads(串): dumps() 产出的串很短(<512), 若走
        login(tokenstore=串) 会被库的 len>512 分支误判为文件路径而失败。
        """
        client = Garmin(is_cn=is_cn)
        client.client.loads(token)
        return cls(client, is_only_running)

    @classmethod
    def from_tokenstore(
        cls,
        path,
        is_cn=False,
        is_only_running=False,
        email=None,
        password=None,
    ):
        """用 token 文件构造 —— 让库自带的降级链生效。

        走 login(tokenstore=路径) 而非 loads(串), 因为库只在 _tokenstore_path
        非空时才回写磁盘。这一条路径同时带来三件事:
          1. token 快过期(exp-900s)时主动刷新, 并把轮换出的新 refresh token 落盘
          2. 文件缺失/损坏时, 若有账密则自动降级登录, 登录后回写
          3. token 能加载但被 API 拒(stale cache)时, 清状态后账密重登

        没有账密且文件不可用时直接报错, 不静默继续 —— 否则会退化成
        库 issue #369 描述的「坏文件短路策略链」。
        """
        path = Path(path)
        has_credentials = bool(email and password)
        if not path.exists() and not has_credentials:
            raise GarminAuthError(_NO_CREDENTIAL_HINT)

        client = Garmin(
            email=email or None,
            password=password or None,
            is_cn=is_cn,
        )
        try:
            client.login(tokenstore=str(path))
        except GarminConnectAuthenticationError as e:
            raise GarminAuthError(_AUTH_HINT) from e
        except Exception as e:
            raise GarminAuthError(f"{_AUTH_HINT}\n\n底层错误: {e}") from e
        return cls(client, is_only_running, tokenstore_path=path)

    def persist_tokenstore(self):
        """把内存里的最新 token 落盘 —— 退出前的 checkpoint。

        库只在「快过期时主动刷新」这一条路径上回写; 同步过程中途轮换出的
        新 refresh token 不一定落盘。退出前补一次, 保证下次运行拿到最新串。
        串模式(无路径)静默跳过。
        """
        if not self._tokenstore_path:
            return
        self._client.client.dump(str(self._tokenstore_path))

    def current_refresh_token(self):
        """当前内存里的 refresh token, 供轮换观测使用。取不到返回 None。"""
        return getattr(self._client.client, "di_refresh_token", None)

    @classmethod
    def login_with_credentials(
        cls, email, password, is_cn=False, prompt_mfa=None, is_only_running=False
    ):
        """账密登录,返回可用于后续下载或产出 token 的实例。"""
        client = Garmin(
            email=email, password=password, is_cn=is_cn, prompt_mfa=prompt_mfa
        )
        client.login()
        return cls(client, is_only_running)

    def list_activities(self, start, limit):
        """拉一页活动摘要(原始 dict 列表)。

        这是同步流程第一次真实 API 调用,401 优先在此暴露。捕获后转成
        带排查指引的 GarminAuthError,替代满屏底层 traceback。
        """
        activity_type = "running" if self.is_only_running else None
        try:
            return self._client.get_activities(start, limit, activity_type)
        except GarminConnectAuthenticationError as e:
            raise GarminAuthError(_AUTH_HINT) from e

    def get_activity_summary(self, activity_id):
        """拉单条活动详情(用于 summary 注入与标题)。"""
        return self._client.get_activity(activity_id)

    def get_hr_zones(self, activity_id):
        """拉单条活动的心率区间时长分布(5 档)。失败返回 None,不阻塞主同步流程。"""
        try:
            return self._client.get_activity_hr_in_timezones(activity_id)
        except Exception:
            return None

    def get_max_metrics(self, date_str):
        """拉指定日期的 VO2max 数据。失败返回 None,不阻塞主同步流程。"""
        try:
            return self._client.get_max_metrics(date_str)
        except Exception:
            return None

    def get_training_status(self, date_str):
        """拉指定日期的训练状态/负荷数据。失败返回 None,不阻塞主同步流程。"""
        try:
            return self._client.get_training_status(date_str)
        except Exception:
            return None

    def download(self, activity_id, file_type):
        """下载活动为指定格式,返回 bytes。"""
        dl_fmt = DOWNLOAD_FORMATS[file_type]
        return self._client.download_activity(activity_id, dl_fmt=dl_fmt)

    @property
    def raw(self):
        """暴露底层 Garmin 对象,应急用。"""
        return self._client

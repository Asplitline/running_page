"""佳明主同步 — 下载活动 GPX 并落库生成 activities.json。

流程: 认证(token) → 迭代下载新活动 GPX → make_activities_file 落库
      → 同步每日身体状态(VO2max/训练状态,失败不阻断主流程)。

用法:
  python -m backend.sync_garmin.sync <secret> [--is-cn] [--only-run]
  python -m backend.sync_garmin.sync --tokenstore <path> [--is-cn] [--only-run]

secret 是 make_secret 产出的 token 串(一次性,轮换值不落盘)。
--tokenstore 走文件模式,能持久化轮换后的 refresh token,CI 应用这条。
账密可选(--email/--password 或 GARMIN_EMAIL/GARMIN_PASSWORD),
仅在 token 文件不可用时作为降级登录通道。
"""

import argparse
import os
import sys
from pathlib import Path

from backend.config import DAILY_METRICS_JSON_FILE, GPX_FOLDER, JSON_FILE, SQL_FILE
from backend.generator.db import init_db
from backend.sync_garmin.auth import GarminAuthError, GarminClient
from backend.sync_garmin.daily_metrics import (
    sync_daily_metrics,
    write_latest_daily_metrics_file,
)
from backend.sync_garmin.downloader import download_new_activities
from backend.sync_garmin.token_audit import record_rotation, summarize
from backend.utils import make_activities_file


def get_downloaded_ids(folder):
    """已下载文件名(去扩展名)= 已同步 id。"""
    return [i.split(".")[0] for i in os.listdir(folder) if not i.startswith(".")]


def run_sync(
    secret, is_cn, is_only_running, tokenstore=None, email=None, password=None
):
    if not os.path.exists(GPX_FOLDER):
        os.makedirs(GPX_FOLDER)

    downloaded_ids = get_downloaded_ids(GPX_FOLDER)
    if tokenstore:
        client = GarminClient.from_tokenstore(
            tokenstore,
            is_cn=is_cn,
            is_only_running=is_only_running,
            email=email,
            password=password,
        )
    else:
        client = GarminClient.from_token(
            secret, is_cn=is_cn, is_only_running=is_only_running
        )

    try:
        _sync_activities(client, downloaded_ids)
    finally:
        # 无论业务成败都 checkpoint: 同步途中可能轮换出新 refresh token,
        # 丢了就得等下次 401 才发现。checkpoint 自身失败只告警, 不掩盖业务异常。
        try:
            client.persist_tokenstore()
        except Exception as e:
            print(f"  token checkpoint 失败(下次运行可能需要重新登录): {e}")
        if tokenstore:
            _audit_token(client, tokenstore)


def _audit_token(client, tokenstore):
    """记录 refresh token 轮换史并打印摘要。纯诊断, 失败不影响同步结果。"""
    try:
        audit_path = Path(tokenstore).with_name("garmin_token_audit.json")
        record_rotation(audit_path, client.current_refresh_token())
        print(summarize(audit_path))
    except Exception as e:
        print(f"  token 观测失败(不影响同步): {e}")


def _sync_activities(client, downloaded_ids):
    """活动下载 + 落库 + 每日身体状态。从 run_sync 拆出,便于 finally 包裹。"""
    _, id2title = download_new_activities(client, downloaded_ids, GPX_FOLDER, "gpx")

    make_activities_file(
        SQL_FILE,
        GPX_FOLDER,
        JSON_FILE,
        file_suffix="gpx",
        activity_title_dict=id2title,
    )

    # 每日身体状态(VO2max/训练状态),独立于活动下载, 失败不阻断上面的主流程
    try:
        session = init_db(SQL_FILE)
        sync_daily_metrics(client, session)
        write_latest_daily_metrics_file(session, DAILY_METRICS_JSON_FILE)
    except Exception as e:
        print(f"  每日身体状态同步失败(不影响活动数据): {e}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("secret_string", nargs="?", help="token from make_secret")
    parser.add_argument(
        "--tokenstore",
        dest="tokenstore",
        help="token 文件路径。走此模式才能持久化轮换后的 refresh token",
    )
    parser.add_argument("--email", dest="email", help="账号邮箱,token 失效时降级登录用")
    parser.add_argument(
        "--password", dest="password", help="账号密码,token 失效时降级登录用"
    )
    parser.add_argument(
        "--is-cn", dest="is_cn", action="store_true", help="if garmin account is cn"
    )
    parser.add_argument(
        "--only-run",
        dest="only_run",
        action="store_true",
        help="if is only for running",
    )
    options = parser.parse_args()
    if not options.secret_string and not options.tokenstore:
        print("需要提供 secret_string 或 --tokenstore")
        sys.exit(1)
    try:
        run_sync(
            options.secret_string,
            options.is_cn,
            options.only_run,
            tokenstore=options.tokenstore,
            email=options.email or os.getenv("GARMIN_EMAIL"),
            password=options.password or os.getenv("GARMIN_PASSWORD"),
        )
    except GarminAuthError as e:
        print(f"\n{e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

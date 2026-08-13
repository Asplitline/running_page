"""佳明主同步 — 下载活动 GPX 并落库生成 activities.json。

流程: 认证(token) → 迭代下载新活动 GPX → make_activities_file 落库
      → 同步每日身体状态(VO2max/训练状态,失败不阻断主流程)。

用法:
  python -m backend.sync_garmin.sync <secret> [--is-cn] [--only-run]

secret 是 make_secret 产出的 token 串。
"""

import argparse
import os
import sys

from backend.config import DAILY_METRICS_JSON_FILE, GPX_FOLDER, JSON_FILE, SQL_FILE
from backend.generator.db import init_db
from backend.sync_garmin.auth import GarminAuthError, GarminClient
from backend.sync_garmin.daily_metrics import (
    sync_daily_metrics,
    write_latest_daily_metrics_file,
)
from backend.sync_garmin.downloader import download_new_activities
from backend.utils import make_activities_file


def get_downloaded_ids(folder):
    """已下载文件名(去扩展名)= 已同步 id。"""
    return [i.split(".")[0] for i in os.listdir(folder) if not i.startswith(".")]


def run_sync(secret, is_cn, is_only_running):
    if not os.path.exists(GPX_FOLDER):
        os.makedirs(GPX_FOLDER)

    downloaded_ids = get_downloaded_ids(GPX_FOLDER)
    client = GarminClient.from_token(
        secret, is_cn=is_cn, is_only_running=is_only_running
    )
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
        "--is-cn", dest="is_cn", action="store_true", help="if garmin account is cn"
    )
    parser.add_argument(
        "--only-run",
        dest="only_run",
        action="store_true",
        help="if is only for running",
    )
    options = parser.parse_args()
    if not options.secret_string:
        print("Missing secret_string argument")
        sys.exit(1)
    try:
        run_sync(options.secret_string, options.is_cn, options.only_run)
    except GarminAuthError as e:
        print(f"\n{e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

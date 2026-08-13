"""佳明每日身体状态同步 — VO2max + 训练状态 (阶段3b)。

与活动下载(downloader.py)完全独立: 这里同步的是"今天"的全局身体状态快照，
不是逐次跑步的属性。数据来源与字段结构见 backend/generator/db.py::DailyMetric
的类注释(已用真实账号一次性核实)。

失败降级: 佳明 API 异常/字段缺失都不应阻断主同步流程(GPX 下载+活动落库)，
所以本模块内部各环节都 try/except 兜底，最坏情况只是这次不更新 daily_metrics。
"""

import datetime as dt
import json
import os

import pytz

from backend.generator.db import DailyMetric

# 项目既有约定的默认时区(gpxtrackposter/utils.py 同款 fallback),
# 用于取"今天"这个自然日期 —— 避免 UTC 午夜前后跑同步时日期偏移一天。
_LOCAL_TZ = pytz.timezone("Asia/Shanghai")


def _extract_vo2max(max_metrics_raw):
    """从 get_max_metrics 返回中提取 VO2max。结构: list[{generic: {...}}]。"""
    if not max_metrics_raw:
        return None, None
    try:
        generic = max_metrics_raw[0].get("generic") or {}
        return generic.get("vo2MaxValue"), generic.get("vo2MaxPreciseValue")
    except Exception as e:
        print(f"  提取 VO2max 失败: {e}")
        return None, None


def _extract_training_status(training_status_raw):
    """从 get_training_status 返回中提取训练状态。
    结构: mostRecentTrainingStatus.latestTrainingStatusData.<deviceId>: {...}。
    取第一个 device 的数据(多数账号只有一台主力设备)。
    """
    if not training_status_raw:
        return None, None, None
    try:
        device_map = (
            training_status_raw.get("mostRecentTrainingStatus", {}).get(
                "latestTrainingStatusData", {}
            )
            or {}
        )
        device_id = next(iter(device_map), None)
        if device_id is None:
            return None, None, None
        inner = device_map[device_id]
        return (
            inner.get("trainingStatus"),
            inner.get("trainingStatusFeedbackPhrase"),
            inner.get("weeklyTrainingLoad"),
        )
    except Exception as e:
        print(f"  提取训练状态失败: {e}")
        return None, None, None


def sync_daily_metrics(client, session, date_str=None):
    """同步指定日期(默认今天)的 VO2max/训练状态到 daily_metrics 表。

    两个 API 都失败/无数据时跳过写入(不覆盖已有数据)。异常不向上抛，
    调用方(sync.py)不需要额外包裹。
    """
    date_str = date_str or dt.datetime.now(tz=_LOCAL_TZ).date().isoformat()

    try:
        max_metrics_raw = client.get_max_metrics(date_str)
        training_status_raw = client.get_training_status(date_str)
    except Exception as e:
        print(f"  拉取每日身体状态失败: {e}")
        return

    vo2max, vo2max_precise = _extract_vo2max(max_metrics_raw)
    training_status, training_status_label, weekly_load = _extract_training_status(
        training_status_raw
    )

    if vo2max is None and training_status is None and training_status_label is None:
        print(f"  {date_str} 无可用的 VO2max/训练状态数据，跳过")
        return

    try:
        metric = session.query(DailyMetric).filter_by(date=date_str).first()
        if not metric:
            metric = DailyMetric(date=date_str)
            session.add(metric)
        metric.vo2max = vo2max
        metric.vo2max_precise = vo2max_precise
        metric.training_status = training_status
        metric.training_status_label = training_status_label
        metric.weekly_training_load = weekly_load
        session.commit()
        print(f"  {date_str} 每日身体状态已更新")
    except Exception as e:
        print(f"  写入每日身体状态失败: {e}")


def write_latest_daily_metrics_file(session, json_file):
    """把最新一条 daily_metrics 写成 daily_metrics.json，供前端读取。
    无数据时不写文件(前端按文件缺失降级，不渲染对应 KPI)。
    """
    try:
        latest = session.query(DailyMetric).order_by(DailyMetric.date.desc()).first()
        if not latest:
            return
        os.makedirs(os.path.dirname(json_file), exist_ok=True)
        with open(json_file, "w") as f:
            json.dump(latest.to_dict(), f)
    except Exception as e:
        print(f"  写入 daily_metrics.json 失败: {e}")

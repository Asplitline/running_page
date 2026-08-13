import os

# getting content root directory
current = os.path.dirname(os.path.realpath(__file__))  # backend/
parent = os.path.dirname(current)  # 项目根

# 下载落盘目录(运行时按需 makedirs)
GPX_FOLDER = os.path.join(parent, "GPX_OUT")
FOLDER_DICT = {
    "gpx": GPX_FOLDER,
}

# 数据库随 backend 走(data.db 在 backend/ 内)
SQL_FILE = os.path.join(current, "data.db")
# 前端构建期消费的产物(编译期 import,必须落在 frontend/src/static/)
JSON_FILE = os.path.join(parent, "frontend", "src", "static", "activities.json")
# 每日身体状态(VO2max/训练状态)产物,同目录,前端按需惰性探测
DAILY_METRICS_JSON_FILE = os.path.join(
    parent, "frontend", "src", "static", "daily_metrics.json"
)
# 已同步文件记录
SYNCED_FILE = os.path.join(parent, "imported.json")

import json
import os

from backend.generator import Generator


def make_activities_file(
    sql_file, data_dir, json_file, file_suffix="gpx", activity_title_dict={}
):
    generator = Generator(sql_file)
    generator.sync_from_data_dir(
        data_dir, file_suffix=file_suffix, activity_title_dict=activity_title_dict
    )
    activities_list = generator.load()
    # json_file 落在 frontend/src/static/ 下,该目录里唯一的文件被 gitignore
    # 忽略,runner checkout 后目录不存在,故写入前先建父目录
    os.makedirs(os.path.dirname(json_file), exist_ok=True)
    with open(json_file, "w") as f:
        json.dump(activities_list, f)

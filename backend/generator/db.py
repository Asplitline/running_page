import datetime
import json
import os
import random
import string

from geopy.geocoders import Nominatim, options
from sqlalchemy import (
    Column,
    Float,
    Integer,
    Interval,
    String,
    create_engine,
    inspect,
    text,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

Base = declarative_base()


# random user name 8 letters
def randomword():
    letters = string.ascii_lowercase
    return "".join(random.choice(letters) for i in range(4))


options.default_user_agent = "running_page"
options.default_timeout = int(os.getenv("GEOPY_TIMEOUT", "10"))
# reverse the location (lat, lon) -> location detail
g = Nominatim(user_agent=randomword())
SKIP_REVERSE_GEOCODE = os.getenv("SKIP_REVERSE_GEOCODE", "false").lower() == "true"


ACTIVITY_KEYS = [
    "run_id",
    "name",
    "distance",
    "moving_time",
    "type",
    "subtype",
    "start_date",
    "start_date_local",
    "location_country",
    "summary_polyline",
    "average_heartrate",
    "max_heartrate",
    "average_speed",
    "average_cadence",
    "cadence_trend",
    "split_paces",
    "split_heart_rates",
    "elevation_gain",
    "calories",
    "elevation_loss",
    "min_elevation",
    "max_elevation",
    "avg_power",
    "max_power",
    "aerobic_te",
    "anaerobic_te",
    "avg_stride_length",
    "hr_zones",
]


class Activity(Base):
    __tablename__ = "activities"

    run_id = Column(Integer, primary_key=True)
    name = Column(String)
    distance = Column(Float)
    moving_time = Column(Interval)
    elapsed_time = Column(Interval)
    type = Column(String)
    subtype = Column(String)
    start_date = Column(String)
    start_date_local = Column(String)
    location_country = Column(String)
    summary_polyline = Column(String)
    average_heartrate = Column(Float)
    max_heartrate = Column(Float)
    average_speed = Column(Float)
    average_cadence = Column(Float)
    cadence_trend = Column(String)
    split_paces = Column(String)
    split_heart_rates = Column(String)
    elevation_gain = Column(Float)
    calories = Column(Float)
    elevation_loss = Column(Float)
    min_elevation = Column(Float)
    max_elevation = Column(Float)
    avg_power = Column(Float)
    max_power = Column(Float)
    aerobic_te = Column(Float)
    anaerobic_te = Column(Float)
    avg_stride_length = Column(Float)
    hr_zones = Column(String)
    streak = None

    def to_dict(self):
        out = {}
        for key in ACTIVITY_KEYS:
            attr = getattr(self, key)
            if isinstance(attr, (datetime.timedelta, datetime.datetime)):
                out[key] = str(attr)
            elif key in {
                "cadence_trend",
                "split_paces",
                "split_heart_rates",
                "hr_zones",
            }:
                out[key] = json.loads(attr) if attr else None
            else:
                out[key] = attr

        if self.streak:
            out["streak"] = self.streak

        return out


class DailyMetric(Base):
    """佳明每日身体状态快照(VO2max/训练状态),按日期而非按跑步记录。

    与 Activity 表独立: 同一天可能有 0~N 次跑步, 但身体状态只有一份,
    语义上不属于"某次跑步"的属性。数据来源见 sync_garmin/daily_metrics.py。
    """

    __tablename__ = "daily_metrics"

    date = Column(String, primary_key=True)  # YYYY-MM-DD
    vo2max = Column(Float)
    vo2max_precise = Column(Float)
    training_status = Column(Integer)  # 佳明原始枚举值
    training_status_label = Column(String)  # trainingStatusFeedbackPhrase
    weekly_training_load = Column(Float)

    def to_dict(self):
        return {
            "date": self.date,
            "vo2max": self.vo2max,
            "vo2max_precise": self.vo2max_precise,
            "training_status": self.training_status,
            "training_status_label": self.training_status_label,
            "weekly_training_load": self.weekly_training_load,
        }


def update_or_create_activity(session, run_activity):
    created = False
    try:
        activity = (
            session.query(Activity).filter_by(run_id=int(run_activity.id)).first()
        )

        current_elevation_gain = 0.0  # default value

        # https://github.com/stravalib/stravalib/blob/main/src/stravalib/strava_model.py#L639C1-L643C41
        if (
            hasattr(run_activity, "total_elevation_gain")
            and run_activity.total_elevation_gain is not None
        ):
            current_elevation_gain = float(run_activity.total_elevation_gain)
        elif (
            hasattr(run_activity, "elevation_gain")
            and run_activity.elevation_gain is not None
        ):
            current_elevation_gain = float(run_activity.elevation_gain)

        if not activity:
            start_point = run_activity.start_latlng
            location_country = getattr(run_activity, "location_country", "")
            # or China for #176 to fix
            if not SKIP_REVERSE_GEOCODE and (
                not location_country and start_point or location_country == "China"
            ):
                try:
                    location_country = str(
                        g.reverse(
                            f"{start_point.lat}, {start_point.lon}",
                            language="zh-CN",  # type: ignore
                            timeout=options.default_timeout,
                        )
                    )
                except Exception:
                    try:
                        location_country = str(
                            g.reverse(
                                f"{start_point.lat}, {start_point.lon}",
                                language="zh-CN",  # type: ignore
                                timeout=options.default_timeout,
                            )
                        )
                    except Exception:
                        pass

            activity = Activity(
                run_id=run_activity.id,
                name=run_activity.name,
                distance=run_activity.distance,
                moving_time=run_activity.moving_time,
                elapsed_time=run_activity.elapsed_time,
                type=run_activity.type,
                subtype=run_activity.subtype,
                start_date=run_activity.start_date,
                start_date_local=run_activity.start_date_local,
                location_country=location_country,
                average_heartrate=run_activity.average_heartrate,
                max_heartrate=run_activity.max_heartrate,
                average_speed=float(run_activity.average_speed),
                average_cadence=run_activity.average_cadence,
                cadence_trend=run_activity.cadence_trend,
                split_paces=run_activity.split_paces,
                split_heart_rates=run_activity.split_heart_rates,
                elevation_gain=current_elevation_gain,
                summary_polyline=(
                    run_activity.map and run_activity.map.summary_polyline or ""
                ),
                calories=getattr(run_activity, "calories", None),
                elevation_loss=getattr(run_activity, "elevation_loss", None),
                min_elevation=getattr(run_activity, "min_elevation", None),
                max_elevation=getattr(run_activity, "max_elevation", None),
                avg_power=getattr(run_activity, "avg_power", None),
                max_power=getattr(run_activity, "max_power", None),
                aerobic_te=getattr(run_activity, "aerobic_te", None),
                anaerobic_te=getattr(run_activity, "anaerobic_te", None),
                avg_stride_length=getattr(run_activity, "avg_stride_length", None),
                hr_zones=getattr(run_activity, "hr_zones", None),
            )
            session.add(activity)
            created = True
        else:
            activity.name = run_activity.name
            activity.distance = float(run_activity.distance)
            activity.moving_time = run_activity.moving_time
            activity.elapsed_time = run_activity.elapsed_time
            activity.type = run_activity.type
            activity.subtype = run_activity.subtype
            activity.average_heartrate = run_activity.average_heartrate
            activity.max_heartrate = run_activity.max_heartrate
            activity.average_speed = float(run_activity.average_speed)
            activity.average_cadence = run_activity.average_cadence
            activity.cadence_trend = run_activity.cadence_trend
            activity.split_paces = run_activity.split_paces
            activity.split_heart_rates = run_activity.split_heart_rates
            activity.elevation_gain = current_elevation_gain
            activity.summary_polyline = (
                run_activity.map and run_activity.map.summary_polyline or ""
            )
            activity.calories = getattr(run_activity, "calories", None)
            activity.elevation_loss = getattr(run_activity, "elevation_loss", None)
            activity.min_elevation = getattr(run_activity, "min_elevation", None)
            activity.max_elevation = getattr(run_activity, "max_elevation", None)
            activity.avg_power = getattr(run_activity, "avg_power", None)
            activity.max_power = getattr(run_activity, "max_power", None)
            activity.aerobic_te = getattr(run_activity, "aerobic_te", None)
            activity.anaerobic_te = getattr(run_activity, "anaerobic_te", None)
            activity.avg_stride_length = getattr(
                run_activity, "avg_stride_length", None
            )
            activity.hr_zones = getattr(run_activity, "hr_zones", None)
    except Exception as e:
        print(f"something wrong with {run_activity.id}")
        print(str(e))

    return created


def add_missing_columns(engine, model):
    inspector = inspect(engine)
    table_name = model.__tablename__
    columns = {col["name"] for col in inspector.get_columns(table_name)}
    missing_columns = []

    for column in model.__table__.columns:
        if column.name not in columns:
            missing_columns.append(column)
    if missing_columns:
        with engine.connect() as conn:
            for column in missing_columns:
                column_type = str(column.type)
                conn.execute(
                    text(
                        f"ALTER TABLE {table_name} ADD COLUMN {column.name} {column_type}"
                    )
                )


def init_db(db_path):
    engine = create_engine(
        f"sqlite:///{db_path}", connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(engine)

    # check missing columns
    add_missing_columns(engine, Activity)

    sm = sessionmaker(bind=engine)
    session = sm()
    # apply the changes
    session.commit()
    return session

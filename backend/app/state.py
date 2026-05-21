import copy
from services.pipeline import PipelineService
from config.cameras import CAMERA_REGISTRY

officers_db: list[dict] = [
    {"id": "go1",  "name": "Richard Woods",   "badge": "SO-1001", "status": "offline", "location": "lobby",      "task": None, "online": False},
    {"id": "go2",  "name": "Carolyn Fuller",   "badge": "SO-1002", "status": "offline", "location": "gathering_area",         "task": None, "online": False},
    {"id": "go3",  "name": "Stephen Davies",   "badge": "SO-1003", "status": "offline", "location": "parking_area",     "task": None, "online": False},
    {"id": "go4",  "name": "Franklin Gibson",  "badge": "SO-1004", "status": "offline", "location": "canteen",  "task": None, "online": False},
    {"id": "go5",  "name": "Carol Barnes",     "badge": "SO-1005", "status": "offline", "location": "server_room",    "task": None, "online": False},
    {"id": "go6",  "name": "Eric Diaz",        "badge": "SO-1006", "status": "offline", "location": "meeting_room",       "task": None, "online": False},
    {"id": "go7",  "name": "Alex Hugh",        "badge": "SO-1007", "status": "offline", "location": "conference_room",       "task": None, "online": False},
    {"id": "go8",  "name": "Sarah Moreno",     "badge": "SO-1008", "status": "offline", "location": "office_area",      "task": None, "online": False},
    {"id": "go9",  "name": "Gilbert Leonard",  "badge": "SO-1009", "status": "offline", "location": "command_center",     "task": None, "online": False},
    {"id": "go10", "name": "Tyson Bernard",    "badge": "SO-1010", "status": "offline", "location": "command_center",   "task": None, "online": False},
]

INITIAL_OFFICERS_DB = copy.deepcopy(officers_db)

latest_cctv_snapshots: dict = {}
incidents_db: list[dict] = []
dispatches_db: list[dict] = []
reports_db: list[dict] = []

pipeline = PipelineService(window_seconds=120, enable_advisory=False)

for cam in CAMERA_REGISTRY:
    pipeline.register_camera(
        camera_id=cam["camera_id"],
        model_path=cam["model_path"],
        location=cam["location"],
        conf_threshold=cam["conf_threshold"],
        restricted_zones=cam["restricted_zones"],
    )

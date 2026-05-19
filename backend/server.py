import sys
import os
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from config.cameras import CAMERA_REGISTRY
from config.locations import is_valid_location

def test_all_camera_locations_are_valid():
    for camera in CAMERA_REGISTRY:
        assert is_valid_location(camera["location"]), (
            f"Camera {camera['camera_id']} has invalid location: {camera['location']}"
        )

# Ensure backend root is on sys.path for submodule imports
sys.path.insert(0, str(Path(__file__).resolve().parent))

load_dotenv()

from routes import (
    incident_router,
    officers_router,
    dispatches_router,
    reports_router,
    pipeline_router,
    demo_router,
    command_center_map_router,
)

app = FastAPI(title="Certis Security Management API")

frontend_origins = [
    origin.strip()
    for origin in os.getenv("FRONTEND_ORIGINS", "").split(",")
    if origin.strip()
] or [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(incident_router)
app.include_router(officers_router)
app.include_router(dispatches_router)
app.include_router(reports_router)
app.include_router(pipeline_router)
app.include_router(demo_router)
app.include_router(command_center_map_router)

@app.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

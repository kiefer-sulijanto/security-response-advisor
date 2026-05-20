# Security Response Advisor
### NAISC 2026 — National AI Student Challenge | Team Neural Syndicate

> Built for Certis Group's NAISC 2026 challenge: *"A Security Response Advisor that helps security officers understand incidents and recommend proportionate responses using signals from multiple data sources."*

---

## Overview

An AI-assisted security monitoring prototype that detects incidents from CCTV footage, uploaded videos, and simulated access events, then dispatches nearby ground officers in real time.

The system fuses multiple signal sources into structured incidents, enriches them with an AI advisory, and gives supervisors a human-in-the-loop dashboard to review, dispatch, and track resolution.

### System Architecture

```
CCTV Live Stream / Video Upload / Access Log / Manual Trigger
         ↓
  YOLOv8 Person Detection + Rule-Based Incident Engine
         ↓
  OpenAI Advisory (flag + recommended actions)
         ↓
  Supervisor Dashboard ←→ Ground Officer App
```

### Main System Parts

| Component | Description | Port |
|-----------|-------------|------|
| `backend` | Python FastAPI — detection pipeline, YOLO inference, OpenAI advisory | `8000` |
| `frontend` | React command-centre dashboard for supervisors | `5173` |
| `ground-officer` | React app for ground officers — dispatches and field reports | `5174` |
| `demo-trigger` | React app for triggering simulated security events | `5175` |
| `fight_ai_service` | Separate FastAPI service — VideoMAE fight classification | `9000` |

---

## Current Features

### Signal Ingestion
- **CCTV live camera frame processing** — Real-time YOLO inference per registered camera
- **Uploaded video analysis** — Frame extraction + pipeline processing via `cam_analysis_01`
- **Access log processing** — Access granted / denied events fed into the correlation engine
- **Manual event trigger** — Panic button, fire alerts, and custom events via demo-trigger app

### Incident Detection (Rule-Based Engine)

| Incident | Trigger signals |
|----------|-----------------|
| `intrusion_attempt` | Person detected + access denied at same location |
| `unauthorized_access` | Person detected in restricted zone |
| `after_hours_presence` | Person detected outside permitted hours |
| `loitering` | Person stationary for 60 s+ in the same area |
| `tailgating` | Access granted + multiple persons detected |
| `physical_altercation` | Fight detection model confirms fighting behaviour |
| `unattended_bag` | Bag detected without nearby person for 10 s+ |
| `multiple_persons` | 2+ persons detected in consecutive frames |
| `panic_button` | Manual emergency distress trigger |
| `fire_alert` | Smoke/fire event reported |

### Detection Modules
- **Loitering detector** — 60 s dwell threshold, 80 px movement tolerance, 30 s cooldown
- **Multiple persons detector** — Requires 2+ persons across 2 consecutive frames
- **Unattended bag detector** — Tracks bag position, 10 s unattended threshold, owner-proximity check (180 px radius)
- **Zone presence detector** — Suppresses repeated restricted-area entries from the same person
- **Fight detection** — Off / local model / remote VideoMAE service (configurable)

### AI Advisory (OpenAI)
Each incident is analysed and returns:
- **Flag level** — Green (routine) / Yellow (caution) / Red (critical)
- **Incident explanation** — What happened and why
- **Response actions** — Aligned with open-source SOPs
- **Recommended dispatch unit** — Which officer profile to send
- **Expected response time** — Based on severity

### Incident Dashboard
- Real-time incident list with flag colours and snapshot images
- AI advisory panel per incident
- Recommended officer list ranked by proximity
- Incident status tracking: open → in progress → resolved

### Map View
- Command-centre map grouped by floor (Main Facility / Office Floor / Basement)
- Live officer positions and status
- Active incident count per location

### Dispatch Flow
- Supervisor selects an officer and sends a dispatch with instructions
- Officer receives the task in the Ground Officer app
- Officer updates status: unread → in progress → resolved
- Resolved dispatch resets officer to standby

### Ground Officer App
- Login by selecting officer ID and badge
- Alerts tab showing assigned dispatches
- Report tab for submitting field incident reports
- Handover tab
- Polls backend every 8 seconds for new dispatches

### Demo Trigger App
Simulates the following incidents by calling the backend pipeline directly:
- Physical Altercation, Intrusion Attempt, Unauthorized Access, Tailgating
- Loitering, After Hours Presence, Emergency Distress, Fire Alert, Unattended Bag
- Demo reset — clears all incidents, dispatches, and officer state

### Snapshot Support
- Backend caches the latest CCTV frame per camera (60 s max age)
- Snapshot is attached to each incident for review in the dashboard

### Duplicate Suppression
- 30-second cooldown per incident type per location prevents repeated alerts

---

## Project Structure

```
security-response-advisor/
├── backend/
│   ├── server.py                        # FastAPI app entry point
│   ├── app/
│   │   ├── state.py                     # In-memory DB (officers, incidents, dispatches)
│   │   └── helpers.py                   # Shared helpers (snapshot cache, persist, decode)
│   ├── routes/
│   │   ├── pipeline_routes.py           # /api/pipeline/* endpoints
│   │   ├── incident.py                  # /api/incidents, /api/analyze
│   │   ├── officers.py                  # /api/officers
│   │   ├── dispatches.py                # /api/dispatches
│   │   ├── reports.py                   # /api/reports
│   │   ├── recommendations.py           # /api/incidents/{id}/recommended-officers
│   │   ├── command_center_map.py        # /api/command-center/map
│   │   └── demo.py                      # /api/demo/reset
│   ├── services/
│   │   ├── pipeline.py                  # Pipeline orchestrator
│   │   ├── fight_detection_service.py   # Off / local / remote fight mode switcher
│   │   ├── remote_fight_classifier.py   # HTTP client for fight_ai_service
│   │   ├── advisory.py                  # Advisory builder
│   │   └── detections/
│   │       ├── loitering.py
│   │       ├── multiple_persons.py
│   │       ├── unattended_bag.py
│   │       └── zone_presence.py
│   ├── core/
│   │   ├── incident_engine.py           # Rule-based incident correlation
│   │   ├── event_stream_processor.py    # 120 s sliding event buffer
│   │   └── incident.py
│   ├── extractors/
│   │   ├── cctv_extractor.py            # YOLOv8 inference + restricted zone check
│   │   └── fight_classifier.py          # Local fight classifier (optional)
│   ├── adapters/
│   │   ├── cctv_adapter.py
│   │   ├── access_log_adapter.py
│   │   └── manual_event_adapter.py
│   ├── recommendation_AI/
│   │   └── incident_analysis.py         # OpenAI advisory generation
│   ├── config/
│   │   ├── cameras.py                   # Registered camera IDs and model paths
│   │   ├── locations.py                 # Valid location keys and metadata
│   │   └── location_distances.py        # Location proximity for officer ranking
│   ├── schema/                          # Pydantic request/response schemas
│   ├── models/
│   │   ├── yolov8n.pt                   # YOLOv8 nano weights
│   │   └── fight_classifier.pt          # Local fight classifier (optional)
│   ├── tests/                           # pytest test suite
│   ├── scripts/                         # Benchmark and debug scripts
│   ├── .env.example                     # Backend env template
│   ├── pytest.ini
│   └── requirements.txt
├── frontend/                            # Supervisor command-centre (port 5173)
│   ├── src/
│   │   ├── config/
│   │   │   ├── cameras.js               # Env-driven camera config
│   │   │   └── locations.js             # Shared location options
│   │   ├── components/
│   │   │   └── CameraFeed.jsx           # Live camera + frame processing
│   │   └── pages/
│   │       └── UploadPage.jsx           # Video upload and analysis
│   ├── .env.example                     # Frontend env template
│   └── package.json
├── ground-officer/                      # Officer dispatch app (port 5174)
│   └── src/
│       ├── pages/                       # Login, Home, Alerts, Report, Handover
│       └── services/api.js
├── demo-trigger/                        # Manual event trigger (port 5175)
│   └── src/
│       ├── App.jsx                      # Incident buttons + reset
│       └── services/api.js
└── fight_ai_service/                    # VideoMAE fight detection (port 9000)
    ├── fight_api.py
    ├── requirements.txt
    ├── readme.md
    └── models/
        └── videomae_fight/              # Download separately (see below)
```

---

## Prerequisites

- **Python 3.11+** (project developed on 3.13)
- **Node.js 18+** and **npm**
- **Git**
- **OpenAI API key** — required for AI advisory generation
- Camera source for live feed: DroidCam on a phone, or any IP camera that serves an MJPEG/video URL

---

## Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate — Windows PowerShell
.\venv\Scripts\Activate.ps1

# Activate — macOS / Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the server (local only)
uvicorn server:app --reload

# Start the server (accessible from phones on the same network)
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

- API base: `http://localhost:8000`
- Interactive API docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

> All data is stored **in-memory**. Restarting the backend clears all incidents, dispatches, and reports.
> Use `POST /api/demo/reset` for a clean state without restarting.

---

## Backend Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in your values.

```env
# OpenAI advisory engine
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4.1-mini

# Secret token for POST /api/demo/reset (X-Demo-Secret header)
DEMO_RESET_SECRET=change_me_before_demo

# CORS — add your laptop IP so phones on the same network can reach the backend
FRONTEND_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:5175,http://YOUR_LAPTOP_IP:5173,http://YOUR_LAPTOP_IP:5174,http://YOUR_LAPTOP_IP:5175

# Fight detection mode: off | local | remote
FIGHT_DETECTION_MODE=off

# Local model (used when FIGHT_DETECTION_MODE=local)
LOCAL_FIGHT_MODEL_PATH=models/fight_classifier.pt

# Remote fight AI service (used when FIGHT_DETECTION_MODE=remote)
FIGHT_CLASSIFIER_URL=http://YOUR_AI_SERVICE_IP:9000/predict-fight-clip
FIGHT_CLIP_FRAME_COUNT=16
FIGHT_REMOTE_TIMEOUT_SECONDS=5
FIGHT_REMOTE_DECISION_INTERVAL_SECONDS=2
```

> Run `ipconfig` on Windows or `ifconfig` on macOS/Linux to find your local network IP.

---

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Default URL: `http://localhost:5173`

### Frontend Environment Variables

Copy `frontend/.env.example` to `frontend/.env.local`. The `.env.local` file is gitignored and is where you put your personal camera stream URLs.

```env
# Backend API base
VITE_API_BASE=http://localhost:8000/api

# Camera 1: Server Room — set your stream URL here
VITE_CAM_01_SOURCE=stream
VITE_CAM_01_STREAM_URL=http://YOUR_PHONE_IP:4747/video
VITE_CAM_01_LOCATION=server_room
VITE_CAM_01_PROCESSING_INTERVAL_MS=500
VITE_CAM_01_PROCESSING_ENABLED=true

# Camera 2: Lobby
VITE_CAM_02_SOURCE=stream
VITE_CAM_02_STREAM_URL=http://YOUR_PHONE_IP:4747/video
VITE_CAM_02_LOCATION=lobby
VITE_CAM_02_PROCESSING_INTERVAL_MS=500
VITE_CAM_02_PROCESSING_ENABLED=true

# Camera 3: Gathering Area
VITE_CAM_03_SOURCE=stream
VITE_CAM_03_STREAM_URL=http://YOUR_PHONE_IP:4747/video
VITE_CAM_03_LOCATION=gathering_area
VITE_CAM_03_PROCESSING_INTERVAL_MS=500
VITE_CAM_03_PROCESSING_ENABLED=true

# Cameras 4–6 are demo-only placeholders — no stream URL needed
VITE_CAM_04_PROCESSING_ENABLED=false
VITE_CAM_05_PROCESSING_ENABLED=false
VITE_CAM_06_PROCESSING_ENABLED=false
```

See `frontend/.env.example` for the full variable list.

---

## Camera Configuration

Camera config lives in `frontend/src/config/cameras.js` and is fully driven by Vite environment variables — **no IP addresses are hardcoded in source**.

### How it works

- Each camera is built by `buildCamera()` which reads `VITE_CAM_01_*`, `VITE_CAM_02_*`, etc.
- Missing or empty variables fall back to safe defaults.
- `processingEnabled=false` prevents placeholder cameras from calling the backend pipeline. The guard is inside `CameraFeed.jsx`'s `startProcessing` function.

### Registered cameras (backend)

The backend (`backend/config/cameras.py`) only registers these camera IDs at startup. Sending frames from any other ID will produce a `camera_not_registered` error:

| Camera ID | Location | Purpose |
|-----------|----------|---------|
| `cam_01` | `server_room` | Live CCTV |
| `cam_02` | `lobby` | Live CCTV |
| `cam_03` | `gathering_area` | Live CCTV |
| `cam_analysis_01` | `lobby` | Video upload analysis |

**cam_04, cam_05, cam_06** are frontend-only placeholder cameras that loop demo videos — `processingEnabled` is `false` by default so they never call the backend.

### DroidCam setup

1. Install DroidCam on your phone and the DroidCam client on your laptop.
2. Connect both to the same Wi-Fi network.
3. Note the phone's IP address shown in DroidCam.
4. Set `VITE_CAM_01_STREAM_URL=http://<PHONE_IP>:4747/video` in `frontend/.env.local`.

---

## Location Configuration

Valid locations are defined in two places that must stay in sync:

- **Backend:** `backend/config/locations.py`
- **Frontend:** `frontend/src/config/locations.js`

### Valid location keys

| Key | Label | Floor |
|-----|-------|-------|
| `server_room` | Server Room | Main Facility |
| `meeting_room` | Meeting Room | Main Facility |
| `multi_purpose_room` | Multi-purpose Room | Main Facility |
| `gathering_area` | Gathering Area | Main Facility |
| `conference_room` | Conference Room | Main Facility |
| `canteen` | Canteen | Main Facility |
| `lobby` | Lobby | Main Facility |
| `ceo_office` | CEO Office | Office Floor |
| `manager_office` | Manager Office | Office Floor |
| `executive_office` | Executive Office | Office Floor |
| `office_area` | Office Area | Office Floor |
| `command_center` | Command Center | Office Floor |
| `parking_area` | Parking Area | Basement |
| `store_room` | Store Room | Basement |

Do not use location keys that are not in this list (e.g. `gate_a`, `reception`, `restricted_area`). The backend will reject officer updates with invalid locations.

---

## Fight AI Service Setup

The fight AI service runs separately from the main backend. It uses a VideoMAE model to classify 16-frame clips as `fighting` or `normal`.

### 1. Download the model

The trained model files are not in the repository due to file size. Download the model folder from Google Drive and place it at:

```
fight_ai_service/models/videomae_fight/
    config.json
    model.safetensors
    preprocessor_config.json
```

Google Drive link: see `fight_ai_service/readme.md` for the current download URL.

### 2. Set up and run

```bash
cd fight_ai_service

# Create virtual environment
python -m venv venv

# Activate — Windows PowerShell
.\venv\Scripts\Activate.ps1

# Activate — macOS / Linux
source venv/bin/activate

# For NVIDIA GPU support, install PyTorch with CUDA first:
# pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu126

pip install -r requirements.txt

uvicorn fight_api:app --host 0.0.0.0 --port 9000
```

Verify it is running: `http://localhost:9000/`

### 3. Connect to backend

In `backend/.env`:

```env
FIGHT_DETECTION_MODE=remote
FIGHT_CLASSIFIER_URL=http://127.0.0.1:9000/predict-fight-clip
FIGHT_CLIP_FRAME_COUNT=16
FIGHT_REMOTE_TIMEOUT_SECONDS=8
```

If the fight AI service runs on a separate laptop:

```env
FIGHT_CLASSIFIER_URL=http://<AI_LAPTOP_IP>:9000/predict-fight-clip
```

---

## Ground Officer App Setup

```bash
cd ground-officer
npm install
npm run dev
```

Default URL: `http://localhost:5174` (also accessible from phones on the same network via `http://<LAPTOP_IP>:5174`)

Create `ground-officer/.env` with:

```env
VITE_API_BASE=http://YOUR_LAPTOP_IP:8000/api
```

The app polls the backend every 8 seconds for new dispatches. Officers log in by selecting their ID from the backend officer list, then receive alerts, update dispatch status, and submit field reports.

---

## Demo Trigger App Setup

```bash
cd demo-trigger
npm install
npm run dev -- --port 5175
```

Default URL: `http://localhost:5175` (or from a phone: `http://<LAPTOP_IP>:5175`)

Create `demo-trigger/.env` with:

```env
VITE_API_BASE=http://YOUR_LAPTOP_IP:8000/api
VITE_DEMO_RESET_SECRET=change_me_before_demo
```

`VITE_DEMO_RESET_SECRET` must match `DEMO_RESET_SECRET` in `backend/.env`.

The app lets you select a location and fire incident events (fight, loitering, tailgating, unattended bag, etc.) directly into the backend pipeline. It also has a **Reset Demo State** button that clears all in-memory data.

---

## Running Tests

### Backend

```bash
cd backend
python -m pytest -v
```

Run a specific test file:

```bash
python -m pytest tests/test_unattended_bag_detection.py -v
python -m pytest tests/test_fight_detection.py -v
python -m pytest tests/test_loitering_detection.py -v
```

Available test files:

| File | What it covers |
|------|----------------|
| `test_unattended_bag_detection.py` | Bag dwell, owner proximity, cooldown |
| `test_loitering_detection.py` | Person dwell, movement reset, cooldown |
| `test_multiple_person_detection.py` | Consecutive-frame threshold |
| `test_fight_detection.py` | Fight classifier voting window |
| `test_fight_snapshot_selection.py` | Snapshot selection from fight clip |
| `test_duplicate_suppression.py` | 30 s cooldown between identical incidents |
| `test_after_hours_presence.py` | After-hours time logic |
| `test_zone_entry.py` | Restricted zone entry events |
| `test_Pipeline_person_zone.py` | CCTV pipeline integration |
| `test_cctv_pipeline_integration.py` | End-to-end pipeline flow |
| `test_dispatch_workflow.py` | Dispatch creation and resolution |
| `test_recommended_officers.py` | Officer proximity ranking |
| `test_command_center_map.py` | Map response structure |
| `test_location_config.py` | Location key validation |
| `test_incident_analysis.py` | AI advisory structure |

### Frontend

```bash
cd frontend
npm run build        # Verify the build compiles cleanly
npm test             # Run vitest unit tests
```

### Ground Officer / Demo Trigger

```bash
cd ground-officer && npm test
cd demo-trigger && npm test
```

---

## API Reference

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |

### Pipeline — Signal Ingestion
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/pipeline/cctv` | Submit a CCTV detection label event |
| `POST` | `/api/pipeline/cctv/frame` | Submit a raw video frame (base64) for YOLO inference |
| `POST` | `/api/pipeline/access` | Submit an access log event |
| `POST` | `/api/pipeline/manual-event` | Submit a manual event (panic, fire, etc.) |
| `GET` | `/api/pipeline/events` | Get buffered events (120 s window) |
| `GET` | `/api/pipeline/cameras` | List registered camera IDs |

### Incidents
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/incidents` | List all incidents |
| `POST` | `/api/incidents` | Create an incident manually |
| `PATCH` | `/api/incidents/{id}` | Update incident status or assignment |
| `GET` | `/api/incidents/{id}/recommended-officers` | Get ranked officer recommendations |
| `POST` | `/api/analyze` | Run AI advisory on an incident |

### Officers
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/officers` | List all officers and their status |
| `PATCH` | `/api/officers/{id}` | Update officer status, location, or task |

### Dispatches
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/dispatches` | List dispatches (filter by `?officerId=`) |
| `POST` | `/api/dispatches` | Create a dispatch |
| `PATCH` | `/api/dispatches/{id}` | Update dispatch status |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/reports` | List all field reports |
| `POST` | `/api/reports` | Submit a field report |

### Command Centre Map
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/command-center/map` | Full map with officers and incidents per location |

### Demo
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/demo/reset` | Reset all in-memory state — requires `X-Demo-Secret` header |

---

## Common Issues

**Frontend cannot connect to backend**
- Check `VITE_API_BASE` in `frontend/.env.local` points to the correct host and port.
- Check `FRONTEND_ORIGINS` in `backend/.env` includes the frontend origin (including laptop IP for phone access).
- Check the backend is running and `/health` responds.

**Camera stream not loading**
- Confirm the phone and laptop are on the same Wi-Fi network.
- Confirm the stream URL in `.env.local` is correct and reachable from a browser.
- A `no-url` status in the camera feed means `VITE_CAM_0x_STREAM_URL` is empty.

**`camera_not_registered` errors in backend terminal**
- Only `cam_01`, `cam_02`, `cam_03`, and `cam_analysis_01` are registered.
- `cam_04`, `cam_05`, `cam_06` must have `processingEnabled=false` (the default). If you are seeing these errors, check that the `VITE_CAM_04_PROCESSING_ENABLED` / `05` / `06` variables are not accidentally set to `true`.

**Fight detection not triggering**
- Confirm `FIGHT_DETECTION_MODE=remote` in `backend/.env`.
- Confirm the fight AI service is running and `FIGHT_CLASSIFIER_URL` is correct.
- Check `fight_ai_service/models/videomae_fight/` contains `model.safetensors`.

**Unattended bag not triggering**
- The bag must remain stationary (within 80 px) for at least 10 seconds without a person within 180 px.
- Using the demo-trigger "Unattended Bag" button fires a single synthetic event that bypasses the timer — if that doesn't create an incident, check the pipeline rules.

**Uploaded video no incidents created**
- The video is analysed using `cam_analysis_01`. Make sure this camera ID is registered (it is by default).
- Increase the confidence threshold if detections are marginal, or check backend logs for errors during frame processing.

**Missing Python dependencies**
- Always activate the venv before running: `.\venv\Scripts\Activate.ps1`
- If `ultralytics` or `cv2` import errors appear, re-run `pip install -r requirements.txt` inside the active venv.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Python 3.13, FastAPI, Uvicorn, python-dotenv |
| Detection | YOLOv8 nano (Ultralytics), OpenCV, NumPy |
| Fight AI | VideoMAE (HuggingFace Transformers), PyTorch |
| AI Advisory | OpenAI API (`gpt-4.1-mini`) |
| Frontend | React 19, Vite, Vanilla CSS |
| Testing | pytest (backend), vitest (frontend apps) |

---

## Team

**Neural Syndicate** — NAISC 2026

| Name | Role | Contributions |
|------|------|---------------|
| **Kiefer** *(Team Lead)* | Project Lead, Data Engineer, Full-Stack | Led project management and overall direction. Collected and labelled the training dataset across 3 categories: normal, intrusion/unauthorized, and fighting footage. Built the Ground Officer app and the API server connecting it to the frontend. |
| **Merrick** | Backend Engineer | Built the video upload pipeline, demo trigger app, and live streaming analysis — enabling real-time incident detection via phone camera and laptop/webcam. |
| **Firnando** | Frontend Engineer | Built the supervisor dashboard UI and integrated the live camera feed components. |
| **Teddy** | AI Integration Engineer | Integrated the OpenAI API and designed the analysis output logic — incident descriptions, flag classification (Green/Yellow/Red), and recommended actions after analysis. |
| **Kenneth** | ML & Integration Engineer | Built the incident detection logic on top of the collected dataset, assisted with backend development, and served as the key integrator combining all components. |

---

## Design Decisions

**Why a dashboard + officer app?**
The challenge brief emphasises that AI should surface, not replace, human judgment. The system is designed so that the AI recommends and officers decide — maintaining human accountability at every step.

**Why fuse multiple signal sources?**
A single CCTV detection may be ambiguous. Combining it with access log data (e.g. access denied + person detected = intrusion attempt) or time context (e.g. after-hours presence) creates higher-confidence, proportionate alerts — reducing false positives.

**Why a sliding event buffer?**
Security events often unfold over time. A 120-second correlation window allows the system to connect related signals (e.g. access attempt followed by loitering) into a single meaningful incident, rather than producing isolated noise.

---

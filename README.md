# Security Response Advisor
### NAISC 2026 — National AI Student Challenge | Team Neural Syndicate

> Built for Certis Group's NAISC 2026 challenge: *"A Security Response Advisor that helps security officers understand incidents and recommend proportionate responses using signals from multiple data sources."*

---

## Overview

An AI-powered security incident management system that ingests signals from CCTV footage, access logs, distress events, and manual triggers to automatically detect threats, generate AI-driven response advisories, and coordinate ground officers in real time.

The system addresses Certis's vision of **digital, real-time incident orchestration** — moving from reactive, manual incident handling to a connected platform that surfaces the right information at the right time and orchestrates response across security operations.

### System Architecture

```
CCTV / Video Upload / Live Stream
         ↓
  YOLOv8 Person Detection
         ↓
  Event Pipeline (intrusion, loitering, tailgating, etc.)
         ↓
  OpenAI Advisory Engine (flag + recommended actions)
         ↓
  Supervisor Dashboard ←→ Ground Officer App
```

### Components

| Component | Description | Port |
|-----------|-------------|------|
| `backend` | Python FastAPI — incident pipeline, YOLO detection, OpenAI advisory | `8000` |
| `frontend` | React dashboard — supervisor control room | `5173` |
| `ground-officer` | React app — dispatch view for ground officers | `5174` |
| `demo-trigger` | React app — manual event trigger for demos | `5175` |

---

## Features

### Multi-Source Signal Ingestion
- **CCTV Video Upload** — Upload footage for frame-by-frame YOLO-based person detection
- **Live Camera Streaming** — Real-time detection via phone camera or laptop webcam
- **Access Log Processing** — Detect access denied/granted events and correlate with CCTV
- **Manual Event Trigger** — Simulate panic buttons, fire alerts, and custom events for demos

### Intelligent Incident Detection
Rule-based correlation engine that fuses multiple signals into structured incidents:

| Incident | Trigger | Time Window |
|----------|---------|-------------|
| `intrusion_attempt` | Person detected + access denied |
| `unauthorized_access` | Person in restricted zone | 
| `after_hours_presence` | Person outside allowed hours | 
| `loitering` | Person stationary in same area for 60s+ | 
| `tailgating` | Access granted + multiple persons detected | 
| `panic_button` | Emergency distress signal triggered | 
| `fire_detected` | Smoke/fire event reported |

### AI-Powered Advisory (OpenAI)
Each detected incident is analysed by an AI advisor that outputs:
- **Flag level** — 🟢 Green (routine) / 🟡 Yellow (caution) / 🔴 Red (critical)
- **Incident explanation** — What happened and why it was flagged
- **Proportionate response actions** — Aligned with Certis security industry practices
- **Recommended dispatch unit** — Which officer profile to send
- **Expected response time** — Based on incident severity

### Human-in-the-Loop Dispatch
- Supervisors review AI recommendations and dispatch ground officers
- Officers receive real-time task assignments in the Ground Officer app
- Officers update status (unread → in progress → resolved)
- Officers submit field reports after resolution

### Operational Resilience
- Duplicate incident suppression (30s cooldown)
- Event buffer with 120s sliding window
- Demo reset for clean demonstrations
- Works on local network — phone and laptop cameras supported

---

## Tech Stack

**Backend**
- Python 3.13 — FastAPI + Uvicorn
- YOLOv8 nano (Ultralytics) — real-time person detection
- OpenCV + NumPy — frame decoding and processing
- OpenAI API (`gpt-4o-mini`) — incident advisory generation
- python-dotenv

**Frontend / Ground Officer / Demo Trigger**
- React 19 + Vite
- Vanilla CSS — no UI framework dependencies

---

## Prerequisites

- Python 3.11+
- Node.js 18+
- OpenAI API key

---

## Setup & Running

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd security-response-advisor
```

### 2. Create environment files

**`backend/.env`**
```env
OPENAI_API_KEY=sk-...

FRONTEND_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:5175
```

**`demo-trigger/.env`**
```env
VITE_API_BASE=http://<YOUR_LAPTOP_IP>:8000/api
```

> Replace `<YOUR_LAPTOP_IP>` with your local network IP (e.g. `192.168.1.10`).  
> Run `ipconfig getifaddr en0` on Mac or `ipconfig` on Windows to find it.  
> This allows phone cameras and other devices on the same network to reach the backend.

### 3. Run the backend (Terminal 1)

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate          # macOS / Linux
# venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn server:app --host 0.0.0.0 --port 8000
```

Confirm backend is running: `http://localhost:8000/health`

### 4. Run the frontend — Supervisor Dashboard (Terminal 2)

```bash
cd frontend
npm install
npm run dev -- --host
```

Open `http://localhost:5173`

### 5. Run the ground officer app (Terminal 3)

```bash
cd ground-officer
npm install
npm run dev -- --host
```

Open `http://localhost:5174` — or access from a phone on the same network.

### 6. Run the demo trigger (Terminal 4)

```bash
cd demo-trigger
npm install
npm run dev -- --host
```

Open `http://localhost:5175`

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
| `GET` | `/api/pipeline/events` | Get buffered events (120s window) |
| `GET` | `/api/pipeline/cameras` | List registered cameras |

### Incidents
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/incidents` | List all incidents |
| `POST` | `/api/incidents` | Create an incident manually |
| `PATCH` | `/api/incidents/{id}` | Update incident status or assignment |

### Officers
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/officers` | List all officers and their status |
| `PATCH` | `/api/officers/{id}` | Update officer status, location, or task |

### Dispatches
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/dispatches` | List dispatches (filterable by `officerId`) |
| `POST` | `/api/dispatches` | Create a dispatch |
| `PATCH` | `/api/dispatches/{id}` | Update dispatch status |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/reports` | List all field reports |
| `POST` | `/api/reports` | Submit a field report |

### AI & Demo
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/analyze` | Run AI advisory on a given incident |
| `POST` | `/api/demo/reset` | Reset all in-memory state for demos |

---

## Project Structure

```
security-response-advisor/
├── backend/
│   ├── server.py                  # FastAPI app, endpoints, camera registry
│   ├── services/
│   │   └── pipeline.py            # Main pipeline orchestrator
│   ├── core/
│   │   ├── incident_engine.py     # Rule-based incident detection
│   │   ├── event_stream_processor.py
│   │   ├── events.py
│   │   └── incident.py
│   ├── extractors/
│   │   └── cctv_extractor.py      # YOLOv8 inference + restricted zone check
│   ├── adapters/
│   │   ├── cctv_adapter.py        # CCTV label → event type mapping
│   │   ├── access_log_adapter.py
│   │   └── manual_event_adapter.py
│   ├── recommendation_AI/
│   │   └── incident_analysis.py   # OpenAI advisory generation
│   ├── config/
│   │   └── incident_rules.json    # Incident detection rules
│   ├── models/
│   │   └── yolov8n.pt             # YOLOv8 nano model weights
│   └── requirements.txt
├── frontend/                      # Supervisor dashboard (port 5173)
├── ground-officer/                # Officer dispatch app (port 5174)
└── demo-trigger/                  # Manual event trigger (port 5175)
```

---

## Team

**Neural Syndicate** — NAISC 2026

| Name | Role | Contributions |
|------|------|---------------|
| **Kiefer** *(Team Lead)* | Project Lead, Data Engineer, Full-Stack | Led project management and overall direction. Collected and labelled the training dataset across 3 categories: normal, intrusion/unauthorized, and fighting footage. Built the Ground Officer app and the API server connecting it to the frontend. |
| **Merrick** | Backend Engineer | Built the video upload pipeline, demo trigger app, and live streaming analysis — enabling real-time incident detection via phone camera and laptop/webcam. |
| **Fernando** | Frontend Engineer | Built the supervisor dashboard UI and integrated the live camera feed components. |
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

## Notes

- All data is stored **in-memory**. Restarting the backend clears all incidents, dispatches, and reports. Use `/api/demo/reset` for a clean demo state without restarting.
- The YOLO model (`yolov8n.pt`) detects persons only. Restricted zone polygons are configured per camera in `backend/server.py`.
- The `demo-trigger` app must use the backend host IP (not `localhost`) if accessed from a phone or separate device.

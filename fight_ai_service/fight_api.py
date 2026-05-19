from __future__ import annotations

import base64
from pathlib import Path

import cv2
import numpy as np
import torch
from fastapi import FastAPI
from pydantic import BaseModel
from transformers import VideoMAEImageProcessor, VideoMAEForVideoClassification


MODEL_DIR = Path("models/videomae_fight")
NUM_FRAMES = 16

app = FastAPI()

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

processor = VideoMAEImageProcessor.from_pretrained(str(MODEL_DIR))
model = VideoMAEForVideoClassification.from_pretrained(str(MODEL_DIR))
model.to(device)
model.eval()


class FightClipRequest(BaseModel):
    camera_id: str
    frames_base64: list[str]


def decode_frame(frame_base64: str):
    image_bytes = base64.b64decode(frame_base64)
    image_array = np.frombuffer(image_bytes, dtype=np.uint8)
    frame = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

    if frame is None:
        return None

    frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    return frame


def normalize_frame_count(frames: list[np.ndarray], target_count: int = NUM_FRAMES):
    if not frames:
        return []

    if len(frames) == target_count:
        return frames

    if len(frames) > target_count:
        indices = np.linspace(0, len(frames) - 1, target_count).astype(int)
        return [frames[i] for i in indices]

    frames = list(frames)
    while len(frames) < target_count:
        frames.append(frames[-1])

    return frames


@app.get("/")
def root():
    return {
        "status": "fight video AI service running",
        "device": str(device),
        "model_dir": str(MODEL_DIR),
        "id2label": model.config.id2label,
    }


@app.post("/predict-fight-clip")
def predict_fight_clip(req: FightClipRequest):
    frames = []

    for frame_base64 in req.frames_base64:
        frame = decode_frame(frame_base64)
        if frame is not None:
            frames.append(frame)

    if not frames:
        return {
            "camera_id": req.camera_id,
            "class_name": "unknown",
            "confidence": 0.0,
            "is_fighting": False,
            "source": "local_videomae_service",
            "error": "no_valid_frames",
        }

    frames = normalize_frame_count(frames, NUM_FRAMES)

    inputs = processor(frames, return_tensors="pt")
    pixel_values = inputs["pixel_values"].to(device)

    with torch.no_grad():
        outputs = model(pixel_values=pixel_values)
        probs = torch.softmax(outputs.logits, dim=-1)[0]

    top_index = int(torch.argmax(probs).item())
    confidence = float(probs[top_index].item())

    label = model.config.id2label[top_index]
    class_name = str(label).lower()

    is_fighting = class_name == "fighting" and confidence >= 0.75

    snapshot_frame_index = None
    snapshot_strategy = None

    if is_fighting:
        snapshot_frame_index = len(frames) // 2
        snapshot_strategy = "middle_of_positive_clip"

    return {
        "camera_id": req.camera_id,
        "class_name": class_name,
        "confidence": confidence,
        "is_fighting": is_fighting,
        "source": "local_videomae_service",
        "frames_received": len(req.frames_base64),
        "frames_used": len(frames),
        "snapshot_frame_index": snapshot_frame_index,
        "snapshot_strategy": snapshot_strategy,
    }

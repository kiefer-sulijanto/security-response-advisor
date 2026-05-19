from __future__ import annotations

import base64
import os
from typing import Any

from time import perf_counter

import cv2
import requests


class RemoteFightClassifier:
    def __init__(
        self,
        api_url: str | None = None,
        timeout_seconds: float | None = None,
    ):
        self.api_url = api_url or os.getenv("FIGHT_CLASSIFIER_URL")
        self.timeout_seconds = timeout_seconds or float(
            os.getenv("FIGHT_REMOTE_TIMEOUT_SECONDS", "3")
        )

    @property
    def enabled(self) -> bool:
        return bool(self.api_url)

    @staticmethod
    def encode_frame(frame: Any) -> str:
        ok, buffer = cv2.imencode(".jpg", frame)

        if not ok:
            raise RuntimeError("Failed to encode frame as JPEG")

        return base64.b64encode(buffer).decode("utf-8")

    def predict_clip(self, camera_id: str, frames: list[Any]) -> dict:
        total_start = perf_counter()

        if not self.enabled:
            return {
                "is_fighting": False,
                "class_name": "disabled",
                "confidence": 0.0,
                "source": "remote_disabled",
                "timing": {
                    "remote_total_seconds": perf_counter() - total_start,
                },
            }

        try:
            encode_start = perf_counter()
            frames_base64 = [self.encode_frame(frame) for frame in frames]
            encode_seconds = perf_counter() - encode_start

            payload = {
                "camera_id": camera_id,
                "frames_base64": frames_base64,
            }

            request_start = perf_counter()
            response = requests.post(
                self.api_url,
                json=payload,
                timeout=self.timeout_seconds,
            )
            request_seconds = perf_counter() - request_start

            response.raise_for_status()
            data = response.json()

            return {
                "is_fighting": bool(data.get("is_fighting", False)),
                "class_name": data.get("class_name", "unknown"),
                "confidence": float(data.get("confidence", 0.0)),
                "source": data.get("source", "remote_fight_classifier"),
                "raw": data,
                "timing": {
                    "remote_encode_seconds": encode_seconds,
                    "remote_request_seconds": request_seconds,
                    "remote_total_seconds": perf_counter() - total_start,
                },
            }

        except Exception as e:
            return {
                "is_fighting": False,
                "class_name": "error",
                "confidence": 0.0,
                "source": "remote_fight_classifier",
                "error": str(e),
                "timing": {
                    "remote_total_seconds": perf_counter() - total_start,
                },
            }
from __future__ import annotations

import os
from collections import deque
from typing import Any

from time import monotonic

from extractors.fight_classifier import FightClassifier
from services.remote_fight_classifier import RemoteFightClassifier


class FightDetectionService:
    def __init__(
        self,
        local_model_path: str | None = None,
    ):
        self.mode = os.getenv("FIGHT_DETECTION_MODE", "local").lower().strip()
        self.local_model_path = local_model_path or os.getenv(
            "LOCAL_FIGHT_MODEL_PATH",
            "models/fight_classifier.pt",
        )

        self.remote_decision_interval_seconds = float(
            os.getenv("FIGHT_REMOTE_DECISION_INTERVAL_SECONDS", "2")
        )

        self.person_missing_grace_frames = int(
            os.getenv("FIGHT_PERSON_MISSING_GRACE_FRAMES", "3")
        )
        self.person_missing_count = 0

        self.last_remote_decision_at: float | None = None
        self.last_remote_result: dict | None = None

        self.clip_frame_count = int(os.getenv("FIGHT_CLIP_FRAME_COUNT", "16"))
        self.frame_buffer = deque(maxlen=self.clip_frame_count)

        self.local_classifier: FightClassifier | None = None
        self.remote_classifier: RemoteFightClassifier | None = None

        if self.mode == "local":
            self._load_local_classifier()

        elif self.mode == "remote":
            self.remote_classifier = RemoteFightClassifier()

        elif self.mode == "off":
            pass

        else:
            print(
                f"Warning: unknown FIGHT_DETECTION_MODE={self.mode}. "
                "Fight detection disabled."
            )
            self.mode = "off"   

    @staticmethod
    def encode_snapshot_frame(frame) -> str | None:
        import base64
        import cv2

        ok, buffer = cv2.imencode(".jpg", frame)

        if not ok:
            return None

        return base64.b64encode(buffer).decode("utf-8")

    def _load_local_classifier(self) -> None:
        try:
            self.local_classifier = FightClassifier(
                model_path=self.local_model_path,
                confidence_threshold=0.90,
                window_size=7,
                min_fight_frames=6,
            )
        except (FileNotFoundError, OSError, RuntimeError, ValueError) as e:
            print(
                f"Warning: failed to load local fight classifier "
                f"from {self.local_model_path}: {e}"
            )
            self.local_classifier = None
            self.mode = "off"

    @staticmethod
    def _empty_result(mode: str, source: str = "not_used") -> dict:
        return {
            "is_fighting": False,
            "class_name": None,
            "confidence": 0.0,
            "source": source,
            "mode": mode,
            "error": None,
            "frames_sent": 0,
            "buffer_size": 0,
            "fight_votes": 0,
            "window_size": 0,
            "frame_positive": False,
        }

    def process_frame(
        self,
        frame: Any,
        camera_id: str,
        person_count: int,
    ) -> dict:
        if self.mode == "off":
            result = self._empty_result(mode="off", source="disabled")
            result["buffer_size"] = len(self.frame_buffer)
            return result

        if person_count < 2:
            self.person_missing_count += 1

            result = self._empty_result(mode=self.mode, source="not_enough_people_grace")
            result["buffer_size"] = len(self.frame_buffer)
            result["person_missing_count"] = self.person_missing_count
            result["person_missing_grace_frames"] = self.person_missing_grace_frames

            if self.person_missing_count >= self.person_missing_grace_frames:
                self.reset()
                result["source"] = "not_enough_people_reset"
                result["buffer_size"] = 0

            return result

        self.person_missing_count = 0

        if self.mode == "remote":
            return self._process_remote(frame=frame, camera_id=camera_id)

        if self.mode == "local":
            return self._process_local(frame=frame)

        result = self._empty_result(mode=self.mode, source="unknown_mode")
        return result

    def _process_remote(self, frame: Any, camera_id: str) -> dict:
        self.frame_buffer.append(frame.copy())

        result = self._empty_result(mode="remote", source="remote_waiting")
        result["buffer_size"] = len(self.frame_buffer)

        if self.remote_classifier is None:
            result["source"] = "remote_not_configured"
            result["error"] = "RemoteFightClassifier is not initialized"
            return result

        if len(self.frame_buffer) < self.clip_frame_count:
            return result
        
        now = monotonic()

        if (
            self.last_remote_decision_at is not None
            and now - self.last_remote_decision_at < self.remote_decision_interval_seconds
        ):
            cached_result = self.last_remote_result or result
            cached_result = dict(cached_result)
            cached_result["source"] = f"{cached_result.get('source', 'remote_cached')}_cached"
            cached_result["buffer_size"] = len(self.frame_buffer)
            cached_result["frames_sent"] = 0
            cached_result["seconds_since_last_remote_call"] = now - self.last_remote_decision_at
            return cached_result
        
        self.last_remote_decision_at = now

        remote_result = self.remote_classifier.predict_clip(
            camera_id=camera_id,
            frames=list(self.frame_buffer),
        )

        frames = list(self.frame_buffer)

        snapshot_base64 = None
        snapshot_frame_index = remote_result.get("raw", remote_result).get("snapshot_frame_index")
        snapshot_strategy = remote_result.get("raw", remote_result).get("snapshot_strategy")

        if remote_result.get("is_fighting") and frames:
            try:
                if snapshot_frame_index is None:
                    snapshot_frame_index = len(frames) // 2

                snapshot_frame_index = int(snapshot_frame_index)
                snapshot_frame_index = max(0, min(snapshot_frame_index, len(frames) - 1))

                snapshot_base64 = self.encode_snapshot_frame(frames[snapshot_frame_index])

                if not snapshot_strategy:
                    snapshot_strategy = "middle_of_positive_clip"

            except (TypeError, ValueError, IndexError):
                snapshot_frame_index = len(frames) // 2
                snapshot_base64 = self.encode_snapshot_frame(frames[snapshot_frame_index])
                snapshot_strategy = "middle_of_positive_clip_fallback"

        final_result = {
            "is_fighting": bool(remote_result.get("is_fighting", False)),
            "class_name": remote_result.get("class_name"),
            "confidence": float(remote_result.get("confidence", 0.0)),
            "source": remote_result.get("source", "remote_fight_classifier"),
            "mode": "remote",
            "error": remote_result.get("error"),
            "frames_sent": len(self.frame_buffer),
            "buffer_size": len(self.frame_buffer),
            "raw": remote_result.get("raw", remote_result),
            "fight_votes": 0,
            "window_size": 0,
            "frame_positive": bool(remote_result.get("is_fighting", False)),
            "timing": remote_result.get("timing", {}),
            "seconds_since_last_remote_call": 0.0,
            "snapshot_base64": snapshot_base64,
            "snapshot_frame_index": snapshot_frame_index,
            "snapshot_strategy": snapshot_strategy,
        }

        self.last_remote_result = final_result
        return final_result

    def _process_local(self, frame: Any) -> dict:
        if self.local_classifier is None:
            result = self._empty_result(mode="local", source="local_not_configured")
            result["error"] = "Local FightClassifier is not initialized"
            return result

        try:
            local_result = self.local_classifier.predict_frame(frame)
        except (RuntimeError, TypeError, ValueError, AttributeError) as e:
            result = self._empty_result(mode="local", source="local_fight_classifier")
            result["error"] = f"local_fight_classifier_failed: {e}"
            return result

        return {
            "is_fighting": bool(local_result.get("confirmed_fighting", False)),
            "class_name": local_result.get("class_name"),
            "confidence": float(local_result.get("confidence", 0.0)),
            "source": "local_fight_classifier",
            "mode": "local",
            "error": local_result.get("error"),
            "frames_sent": 0,
            "buffer_size": 0,
            "raw": local_result,
            "fight_votes": local_result.get("fight_votes", 0),
            "window_size": local_result.get("window_size", 0),
            "frame_positive": local_result.get("is_fighting_frame", False),
            "timing": {},
        }

    def reset(self) -> None:
        self.frame_buffer.clear()
        self.last_remote_decision_at = None
        self.last_remote_result = None
        self.person_missing_count = 0

        if self.local_classifier is not None:
            self.local_classifier.reset()
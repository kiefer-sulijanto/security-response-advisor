from __future__ import annotations

from datetime import datetime
from typing import Any

from time import perf_counter

from ultralytics import YOLO

from services.fight_detection_service import FightDetectionService


class CCTVExtractor:
    def __init__(
        self,
        model_path: str,
        camera_id: str,
        location: str,
        conf_threshold: float = 0.5,
        restricted_zones: dict[str, list[list[tuple[float, float]]]] | None = None,
        fight_model_path: str | None = "models/fight_classifier.pt",
    ):
        try:
            self.model = YOLO(model_path)
        except (FileNotFoundError, OSError, RuntimeError, ValueError) as e:
            raise RuntimeError(f"Failed to load YOLO model from {model_path}: {e}") from e

        self.camera_id = camera_id
        self.location = location
        self.conf_threshold = conf_threshold
        self.restricted_zones = restricted_zones or {}

        self.fight_detection_service = FightDetectionService(
            local_model_path=fight_model_path,
        )

    @staticmethod
    def _point_in_polygon(point: tuple[float, float], polygon: list[tuple[float, float]]) -> bool:
        x, y = point
        inside = False
        n = len(polygon)

        if n < 3:
            return False

        j = n - 1
        for i in range(n):
            xi, yi = polygon[i]
            xj, yj = polygon[j]

            intersects = ((yi > y) != (yj > y)) and (
                x < (xj - xi) * (y - yi) / ((yj - yi) + 1e-9) + xi
            )
            if intersects:
                inside = not inside

            j = i

        return inside

    def _is_in_restricted_area(self, center: tuple[float, float]) -> bool:
        camera_zones = self.restricted_zones.get(self.camera_id, [])
        for polygon in camera_zones:
            if self._point_in_polygon(center, polygon):
                return True
        return False

    def infer_frame(
        self,
        frame: Any,
        conf_threshold: float | None = None,
        timestamp_override: str | None = None,
    ) -> dict:
        if frame is None:
            return {
                "detections": [],
                "debug": {
                    "camera_id": self.camera_id,
                    "location": self.location,
                    "error": "frame_is_none",
                },
            }

        threshold = self.conf_threshold if conf_threshold is None else conf_threshold
        timestamp_value = timestamp_override or datetime.now().isoformat(timespec="seconds")

        try:
            
            yolo_start = perf_counter()
            results = self.model(frame, classes=[0, 24, 26, 28], conf=threshold, verbose=False)
            yolo_seconds = perf_counter() - yolo_start
        
        except (RuntimeError, TypeError, ValueError) as e:
            return {
                "detections": [],
                "debug": {
                    "camera_id": self.camera_id,
                    "location": self.location,
                    "threshold": float(threshold),
                    "timestamp": timestamp_value,
                    "error": f"inference_failed: {e}",
                },
            }

        _BAG_CLASS_IDS = {24, 26, 28}

        detections: list[dict] = []
        debug_results: list[dict] = []

        for result in results:
            names = result.names
            boxes = result.boxes

            if boxes is None or len(boxes) == 0:
                debug_results.append({"person_count": 0, "bag_count": 0})
                continue

            person_count = 0
            bag_count = 0

            for box in boxes:
                try:
                    class_id = int(box.cls[0].item())
                    label = str(names[class_id]).lower()
                    confidence = float(box.conf[0].item())

                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    cx = (x1 + x2) / 2.0
                    cy = (y1 + y2) / 2.0

                    if class_id == 0:
                        in_restricted_area = self._is_in_restricted_area((cx, cy))
                        detections.append({
                            "label": "person",
                            "timestamp": timestamp_value,
                            "location": self.location,
                            "camera_id": self.camera_id,
                            "confidence": confidence,
                            "bbox": [float(x1), float(y1), float(x2), float(y2)],
                            "center": [float(cx), float(cy)],
                            "in_restricted_area": in_restricted_area,
                        })
                        person_count += 1
                    elif class_id in _BAG_CLASS_IDS:
                        detections.append({
                            "label": "bag",
                            "bag_type": label,
                            "timestamp": timestamp_value,
                            "location": self.location,
                            "camera_id": self.camera_id,
                            "confidence": confidence,
                            "bbox": [float(x1), float(y1), float(x2), float(y2)],
                            "center": [float(cx), float(cy)],
                            "in_restricted_area": False,
                        })
                        bag_count += 1

                except (AttributeError, TypeError, ValueError, IndexError, KeyError):
                    continue

            debug_results.append({"person_count": person_count, "bag_count": bag_count})

        total_people = sum(item.get("person_count", 0) for item in debug_results)
        total_bags = sum(item.get("bag_count", 0) for item in debug_results)

        fight_start = perf_counter()
        fight_result = self.fight_detection_service.process_frame(
            frame=frame,
            camera_id=self.camera_id,
            person_count=total_people,
        )
        fight_detection_seconds = perf_counter() - fight_start
        fight_timing = fight_result.get("timing", {})

        if fight_result.get("is_fighting"):
            detections.append(
                {
                    "label": "fighting_or_aggressive",
                    "timestamp": timestamp_value,
                    "location": self.location,
                    "camera_id": self.camera_id,
                    "confidence": fight_result.get("confidence", 1.0),
                    "bbox": None,
                    "center": None,
                    "in_restricted_area": False,
                    "person_count": total_people,
                    "fight_class": fight_result.get("class_name"),
                    "fight_source": fight_result.get("source"),
                    "fight_mode": fight_result.get("mode"),
                    "fight_frames_sent": fight_result.get("frames_sent"),
                    "fight_votes": fight_result.get("fight_votes"),
                    "fight_window_size": fight_result.get("window_size"),
                    "snapshot_base64": fight_result.get("snapshot_base64"),
                    "snapshot_frame_index": fight_result.get("snapshot_frame_index"),
                    "snapshot_strategy": fight_result.get("snapshot_strategy"),
                }
            )
        
        return {
            "detections": detections,
            "debug": {
                "camera_id": self.camera_id,
                "location": self.location,
                "timestamp": timestamp_value,
                "threshold": float(threshold),
                "results": debug_results,
                "total_detections": len(detections),
                "person_count": total_people,
                "bag_count": total_bags,
                "yolo_seconds": yolo_seconds,
                "fight_detection_seconds": fight_detection_seconds,
                "fight_mode": fight_result.get("mode"),
                "fight_class": fight_result.get("class_name"),
                "fight_confidence": fight_result.get("confidence"),
                "fight_is_fighting": fight_result.get("is_fighting"),
                "fight_frame_positive": fight_result.get("frame_positive"),
                "fight_source": fight_result.get("source"),
                "fight_error": fight_result.get("error"),
                "fight_frames_sent": fight_result.get("frames_sent"),
                "fight_buffer_size": fight_result.get("buffer_size"),
                "fight_votes": fight_result.get("fight_votes"),
                "fight_window_size": fight_result.get("window_size"),
                "fight_seconds_since_last_remote_call": fight_result.get("seconds_since_last_remote_call"),
                "remote_fight_encode_seconds": fight_timing.get("remote_encode_seconds"),
                "remote_fight_request_seconds": fight_timing.get("remote_request_seconds"),
                "remote_fight_total_seconds": fight_timing.get("remote_total_seconds"),
                "fight_person_missing_count": fight_result.get("person_missing_count"),
                "fight_person_missing_grace_frames": fight_result.get("person_missing_grace_frames"),
            },
        }

    def extract_detections(
        self,
        frame: Any,
        conf_threshold: float | None = None,
        timestamp_override: str | None = None,
    ) -> list[dict]:
        inference = self.infer_frame(
            frame,
            conf_threshold=conf_threshold,
            timestamp_override=timestamp_override,
        )
        return inference.get("detections", [])
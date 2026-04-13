from __future__ import annotations

from datetime import datetime
from typing import Any

from ultralytics import YOLO


class CCTVExtractor:
    def __init__(
        self,
        model_path: str,
        camera_id: str,
        location: str,
        conf_threshold: float = 0.5,
        restricted_zones: dict[str, list[list[tuple[float, float]]]] | None = None,
    ):
        try:
            self.model = YOLO(model_path)
        except (FileNotFoundError, OSError, RuntimeError, ValueError) as e:
            raise RuntimeError(f"Failed to load YOLO model from {model_path}: {e}") from e

        self.camera_id = camera_id
        self.location = location
        self.conf_threshold = conf_threshold
        self.restricted_zones = restricted_zones or {}

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
            results = self.model(frame, classes=[0], conf=threshold, verbose=False)
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

        detections: list[dict] = []
        debug_results: list[dict] = []

        for result in results:
            names = result.names
            boxes = result.boxes

            if boxes is None or len(boxes) == 0:
                debug_results.append({"person_count": 0})
                continue

            person_count = 0

            for box in boxes:
                try:
                    class_id = int(box.cls[0].item())
                    label = str(names[class_id]).lower()
                    confidence = float(box.conf[0].item())

                    if label != "person":
                        continue

                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    cx = (x1 + x2) / 2.0
                    cy = (y1 + y2) / 2.0
                    in_restricted_area = self._is_in_restricted_area((cx, cy))

                    detection = {
                        "label": "person",
                        "timestamp": timestamp_value,
                        "location": self.location,
                        "camera_id": self.camera_id,
                        "confidence": confidence,
                        "bbox": [float(x1), float(y1), float(x2), float(y2)],
                        "center": [float(cx), float(cy)],
                        "in_restricted_area": in_restricted_area,
                    }
                    detections.append(detection)
                    person_count += 1

                    print("\n=== YOLO PERSON DEBUG ===")
                    print(f"label=person conf={confidence:.4f}")
                    print(f"bbox={[round(x1, 1), round(y1, 1), round(x2, 1), round(y2, 1)]}")
                    print(f"center=({cx:.1f}, {cy:.1f}) restricted={in_restricted_area}")
                    print("=========================\n")

                except (AttributeError, TypeError, ValueError, IndexError, KeyError):
                    continue

            debug_results.append({"person_count": person_count})

        return {
            "detections": detections,
            "debug": {
                "camera_id": self.camera_id,
                "location": self.location,
                "timestamp": timestamp_value,
                "threshold": float(threshold),
                "results": debug_results,
                "total_detections": len(detections),
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
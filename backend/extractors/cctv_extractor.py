from __future__ import annotations

from datetime import datetime
from typing import Any

from ultralytics import YOLO

from extractors.fight_classifier import FightClassifier


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

        self.fight_classifier = None
        if fight_model_path:
            try:
                self.fight_classifier = FightClassifier(
                    model_path=fight_model_path,
                    confidence_threshold=0.90,
                    window_size=7,
                    min_fight_frames=6,
                )
            except (FileNotFoundError, OSError, RuntimeError, ValueError) as e:
                print(f"Warning: failed to load fight classifier from {fight_model_path}: {e}")

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


                except (AttributeError, TypeError, ValueError, IndexError, KeyError):
                    continue

            debug_results.append({"person_count": person_count})

        fight_result = {
            "class_name": None,
            "confidence": 0.0,
            "is_fighting_frame": False,
            "confirmed_fighting": False,
            "fight_votes": 0,
            "window_size": 0,
        }

        total_people = sum(item.get("person_count", 0) for item in debug_results)

        if self.fight_classifier is not None and total_people >= 2:
            try:
                fight_result = self.fight_classifier.predict_frame(frame)
            except (RuntimeError, TypeError, ValueError, AttributeError) as e:
                fight_result = {
                    **fight_result,
                    "error": f"fight_classifier_failed: {e}",
                }
        else:
            if self.fight_classifier is not None:
                self.fight_classifier.reset()

        if fight_result.get("confirmed_fighting"):
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
                    "fight_votes": fight_result.get("fight_votes"),
                    "fight_window_size": fight_result.get("window_size"),
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
                "fight_class": fight_result.get("class_name"),
                "fight_confidence": fight_result.get("confidence"),
                "fight_frame_positive": fight_result.get("is_fighting_frame", False),
                "fight_confirmed": fight_result.get("confirmed_fighting", False),
                "fight_votes": fight_result.get("fight_votes", 0),
                "fight_window_size": fight_result.get("window_size", 0),
                "person_count": total_people,
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
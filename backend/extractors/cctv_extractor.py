from datetime import datetime
from ultralytics import YOLO


class CCTVExtractor:
    def __init__(self, model_path: str, camera_id: str, location: str, conf_threshold: float = 0.6):
        try:
            self.model = YOLO(model_path)
        except (FileNotFoundError, OSError, RuntimeError, ValueError) as e:
            raise RuntimeError(f"Failed to load YOLO model from {model_path}: {e}") from e

        self.camera_id = camera_id
        self.location = location
        self.conf_threshold = conf_threshold

    def extract_detections(self, frame, conf_threshold: float | None = None) -> list[dict]:
        if frame is None:
            return []

        threshold = self.conf_threshold if conf_threshold is None else conf_threshold

        try:
            results = self.model(frame, verbose=False)
        except (RuntimeError, TypeError, ValueError):
            return []

        detections = []

        for result in results:
            try:
                probs = result.probs
                names = result.names

                if probs is None:
                    continue

                top_class_id = int(probs.top1)
                top_confidence = float(probs.top1conf.item())

                if top_confidence < threshold:
                    continue

                label = str(names[top_class_id]).lower()

                if label == "normal":
                    continue

                detections.append({
                    "label": label,
                    "timestamp": datetime.now().isoformat(timespec="seconds"),
                    "location": self.location,
                    "camera_id": self.camera_id,
                    "confidence": top_confidence,
                    "in_restricted_area": False
                })
            except (AttributeError, TypeError, ValueError, IndexError, KeyError):
                continue

        return detections
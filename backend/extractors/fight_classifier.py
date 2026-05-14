from __future__ import annotations

from collections import deque
from typing import Any

from ultralytics import YOLO


class FightClassifier:
    def __init__(
        self,
        model_path: str,
        confidence_threshold: float = 0.75,
        window_size: int = 5,
        min_fight_frames: int = 3,
    ):
        self.model = YOLO(model_path)
        self.confidence_threshold = confidence_threshold
        self.window_size = window_size
        self.min_fight_frames = min_fight_frames
        self.history = deque(maxlen=window_size)

    def predict_frame(self, frame: Any) -> dict:
        results = self.model(frame, verbose=False)
        result = results[0]

        probs = result.probs
        top_index = int(probs.top1)
        confidence = float(probs.top1conf)
        class_name = str(self.model.names[top_index]).lower()

        is_fighting_frame = (
            class_name == "fighting"
            and confidence >= self.confidence_threshold
        )

        self.history.append(is_fighting_frame)

        fight_votes = sum(self.history)
        confirmed = (
            len(self.history) == self.window_size
            and fight_votes >= self.min_fight_frames
        )

        return {
            "class_name": class_name,
            "confidence": confidence,
            "is_fighting_frame": is_fighting_frame,
            "confirmed_fighting": confirmed,
            "fight_votes": fight_votes,
            "window_size": len(self.history),
        }

    def reset(self) -> None:
        self.history.clear()
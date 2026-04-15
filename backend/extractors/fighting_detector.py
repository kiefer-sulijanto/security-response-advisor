from __future__ import annotations
import math
from collections import deque
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

# 🔥 TUNED FOR TUNNEL FIGHTS (High Sensitivity)
DIST_THRESHOLD = 300         # Increased to handle perspective in long tunnels
CLOSE_DIST = 150             # Distance where we are almost certain they are fighting
SPEED_THRESHOLD = 2.0        # Lowered to catch ground wrestling/struggling
WINDOW_SIZE = 8              # Faster reaction time
VOTE_THRESHOLD = 0.3         # Only need ~30% of recent frames to trigger alert
MAX_TRACKING_DISTANCE = 350  # CRITICAL: Keeps ID stable even for fast shoves
MAX_MISSED = 10              # Keeps person in memory if YOLO flickers


@dataclass
class BoundingBox:
    x1: float
    y1: float
    x2: float
    y2: float
    confidence: float = 1.0  # Added this to fix the "TypeError"

    @property
    def cx(self): return (self.x1 + self.x2) / 2
    @property
    def cy(self): return (self.y1 + self.y2) / 2
    @property
    def area(self): return max(0, self.x2 - self.x1) * max(0, self.y2 - self.y1)


@dataclass
class Person:
    id: int
    box: BoundingBox
    prev_cx: Optional[float] = None
    prev_cy: Optional[float] = None
    speed: float = 0
    missed: int = 0


class FightingDetector:
    def __init__(self):
        self.people: Dict[int, Person] = {}
        self.pair_votes: Dict[Tuple[int, int], deque] = {}
        self.next_id = 0

    def process_frame(self, boxes: List[BoundingBox]):
        self._track(boxes)

        persons = list(self.people.values())
        alert_pairs = []
        fighting = False

        if len(persons) >= 2:
            for i in range(len(persons)):
                for j in range(i+1, len(persons)):
                    a = persons[i]
                    b = persons[j]

                    dist = _centroid_distance(a.box, b.box)
                    speed = (a.speed + b.speed) / 2
                    iou = _compute_iou(a.box, b.box)

                    # Fight logic: Close + Fast OR Touching (IoU)
                    is_fight = (dist < DIST_THRESHOLD and speed > SPEED_THRESHOLD) or (iou > 0.001)

                    key = (min(a.id, b.id), max(a.id, b.id))

                    if key not in self.pair_votes:
                        self.pair_votes[key] = deque(maxlen=WINDOW_SIZE)

                    self.pair_votes[key].append(1 if is_fight else 0)

                    votes = self.pair_votes[key]
                    score = sum(votes) / len(votes)

                    # Alert if score is high enough and we have a few frames of evidence
                    if score > VOTE_THRESHOLD and sum(votes) >= 2:
                        alert_pairs.append([a.id, b.id])
                        fighting = True

        return {
            "fighting_detected": fighting,
            "alert_pairs": alert_pairs,
            "person_count": len(self.people),
            "tracked_persons": persons
        }

    def _track(self, boxes):
        matched_ids = set()
        matched_boxes = set()
        candidates = []

        for i, box in enumerate(boxes):
            for pid, p in self.people.items():
                d = _centroid_distance(box, p.box)
                if d < MAX_TRACKING_DISTANCE:
                    candidates.append((d, i, pid))

        candidates.sort()

        for d, i, pid in candidates:
            if i in matched_boxes or pid in matched_ids:
                continue

            box = boxes[i]
            p = self.people[pid]

            if p.prev_cx is not None:
                p.speed = math.hypot(box.cx - p.prev_cx, box.cy - p.prev_cy)

            p.prev_cx = p.box.cx
            p.prev_cy = p.box.cy
            p.box = box
            p.missed = 0

            matched_ids.add(pid)
            matched_boxes.add(i)

        for i, box in enumerate(boxes):
            if i not in matched_boxes:
                self.people[self.next_id] = Person(self.next_id, box)
                self.next_id += 1

        to_delete = []
        for pid, p in self.people.items():
            if pid not in matched_ids:
                p.missed += 1
                if p.missed > MAX_MISSED:
                    to_delete.append(pid)

        for pid in to_delete:
            del self.people[pid]

    def reset(self):
        self.people.clear()
        self.pair_votes.clear()
        self.next_id = 0


# ── HELPERS (Fixed names for Import) ──────────────────

def _centroid_distance(a, b):
    return math.hypot(a.cx - b.cx, a.cy - b.cy)

def _compute_iou(a: BoundingBox, b: BoundingBox) -> float:
    ix1 = max(a.x1, b.x1)
    iy1 = max(a.y1, b.y1)
    ix2 = min(a.x2, b.x2)
    iy2 = min(a.y2, b.y2)
    inter = max(0, ix2 - ix1) * max(0, iy2 - iy1)
    if inter == 0: return 0.0
    union = a.area + b.area - inter
    return inter / union if union > 0 else 0.0


# ── DRAWING ──────────────────────────────────────────

def draw_fighting_boxes(frame, result):
    import cv2
    alert_ids = set()
    for pair in result["alert_pairs"]:
        alert_ids.update(pair)

    for p in result["tracked_persons"]:
        x1, y1, x2, y2 = map(int, [p.box.x1, p.box.y1, p.box.x2, p.box.y2])
        if p.id in alert_ids:
            color, label = (0, 0, 255), f"ID {p.id} FIGHT"
        elif p.speed > SPEED_THRESHOLD:
            color, label = (0, 165, 255), f"ID {p.id} FAST"
        else:
            color, label = (0, 255, 0), f"ID {p.id}"

        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
        cv2.putText(frame, label, (x1, y1-5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

    if result["fighting_detected"]:
        h, w = frame.shape[:2]
        cv2.putText(frame, "FIGHT DETECTED", (w//2-100, 50), 
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 3)

    return frame
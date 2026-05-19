from __future__ import annotations

from datetime import datetime, timezone

from services.detections.utils import distance_between_centers, parse_timestamp


DEFAULT_DWELL_SECONDS = 10
DEFAULT_MOVEMENT_THRESHOLD_PX = 80.0
DEFAULT_OWNER_DISTANCE_THRESHOLD_PX = 180.0
DEFAULT_COOLDOWN_SECONDS = 30
DEFAULT_EXIT_GRACE_SECONDS = 5


class UnattendedBagDetector:
    def __init__(
        self,
        dwell_seconds: int = DEFAULT_DWELL_SECONDS,
        movement_threshold_px: float = DEFAULT_MOVEMENT_THRESHOLD_PX,
        owner_distance_threshold_px: float = DEFAULT_OWNER_DISTANCE_THRESHOLD_PX,
        cooldown_seconds: int = DEFAULT_COOLDOWN_SECONDS,
        exit_grace_seconds: int = DEFAULT_EXIT_GRACE_SECONDS,
    ):
        self.config = {
            "dwell_seconds": dwell_seconds,
            "movement_threshold_px": movement_threshold_px,
            "owner_distance_threshold_px": owner_distance_threshold_px,
            "cooldown_seconds": cooldown_seconds,
            "exit_grace_seconds": exit_grace_seconds,
        }
        # key = (camera_id, location), value = list of tracked bag dicts
        self.state: dict[tuple[str, str], list[dict]] = {}

    def build_detections(
        self,
        detections: list[dict],
        camera_id: str,
        location: str,
        timestamp_override: str | None = None,
    ) -> list[dict]:
        timestamp = parse_timestamp(timestamp_override) or datetime.now()

        bag_detections = [
            d for d in detections
            if isinstance(d, dict) and str(d.get("label", "")).strip().lower() == "bag"
        ]
        person_detections = [
            d for d in detections
            if isinstance(d, dict) and str(d.get("label", "")).strip().lower() == "person"
        ]

        key = (camera_id, location)
        tracked_bags: list[dict] = self.state.get(key, [])

        matched_detection_indices: set[int] = set()

        for tracked in tracked_bags:
            best_dist = float("inf")
            best_idx: int | None = None
            for i, det in enumerate(bag_detections):
                if i in matched_detection_indices:
                    continue
                dist = distance_between_centers(tracked["center"], det.get("center"))
                if dist < best_dist:
                    best_dist = dist
                    best_idx = i

            if best_idx is not None and best_dist <= self.config["movement_threshold_px"]:
                matched_detection_indices.add(best_idx)
                det = bag_detections[best_idx]
                tracked["center"] = det.get("center", tracked["center"])
                tracked["bbox"] = det.get("bbox", tracked["bbox"])
                tracked["confidence"] = det.get("confidence", tracked["confidence"])
                tracked["bag_type"] = det.get("bag_type", tracked["bag_type"])
                tracked["last_seen"] = timestamp

        # Remove bags that have not been seen within exit_grace_seconds
        tracked_bags = [
            t for t in tracked_bags
            if (timestamp - t["last_seen"]).total_seconds() < self.config["exit_grace_seconds"]
        ]

        # Add newly appearing bags (unmatched detections)
        for i, det in enumerate(bag_detections):
            if i not in matched_detection_indices:
                tracked_bags.append({
                    "center": det.get("center"),
                    "bbox": det.get("bbox"),
                    "confidence": det.get("confidence", 1.0),
                    "bag_type": det.get("bag_type", "bag"),
                    "first_seen": timestamp,
                    "last_seen": timestamp,
                    "last_emission": None,
                    "unattended_since": None,
                })

        synthetic: list[dict] = []

        for tracked in tracked_bags:
            nearest_dist = float("inf")
            for person in person_detections:
                dist = distance_between_centers(tracked["center"], person.get("center"))
                if dist < nearest_dist:
                    nearest_dist = dist

            if nearest_dist <= self.config["owner_distance_threshold_px"]:
                # Owner is nearby — reset unattended timer
                tracked["unattended_since"] = None
                continue

            # No nearby person — start timer if not already running
            if tracked["unattended_since"] is None:
                tracked["unattended_since"] = timestamp

            unattended_duration = (timestamp - tracked["unattended_since"]).total_seconds()
            if unattended_duration < self.config["dwell_seconds"]:
                continue

            last_emission = tracked.get("last_emission")
            cooled_down = (
                last_emission is None
                or (timestamp - last_emission).total_seconds() >= self.config["cooldown_seconds"]
            )
            if not cooled_down:
                continue

            synthetic.append({
                "label": "unattended_bag",
                "timestamp": timestamp.isoformat(timespec="seconds"),
                "location": location,
                "camera_id": camera_id,
                "confidence": tracked["confidence"],
                "bbox": tracked["bbox"],
                "center": tracked["center"],
                "in_restricted_area": False,
                "bag_type": tracked["bag_type"],
                "unattended_duration_seconds": int(unattended_duration),
                "nearest_person_distance": nearest_dist if nearest_dist != float("inf") else None,
                "debug_reason": f"unattended_bag:{int(unattended_duration)}s_no_nearby_person",
            })
            tracked["last_emission"] = timestamp

        self.state[key] = tracked_bags
        return synthetic

    def clear(self) -> None:
        self.state.clear()

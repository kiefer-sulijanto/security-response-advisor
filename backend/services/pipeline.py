from __future__ import annotations

from typing import Any

from adapters.access_log_adapter import process_access_log
from adapters.cctv_adapter import process_cctv_detection
from adapters.manual_event_adapter import process_manual_event
from core.event_stream_processor import EventStreamProcessor
from core.incident_engine import IncidentEngine
from extractors.cctv_extractor import CCTVExtractor
from services.advisory import build_advisory, normalize_advisory, pipeline_error
from services.detections import LoiteringDetector, MultiplePersonsDetector, UnattendedBagDetector, ZonePresenceDetector
from services.detections.utils import parse_timestamp


class PipelineService:
    def __init__(
        self,
        window_seconds: int = 120,
        rules_file: str | None = None,
        enable_advisory: bool = True,
    ):
        self.window_seconds = window_seconds
        self.enable_advisory = enable_advisory
        self.processor = EventStreamProcessor(window_seconds=window_seconds)
        self.engine = IncidentEngine(
            rules_file=rules_file,
            duplicate_cooldown_seconds=10,
            consumed_retention_seconds=window_seconds,
        )

        self.extractors: dict[str, CCTVExtractor] = {}
        self.loitering = LoiteringDetector()
        self.zone_presence = ZonePresenceDetector()
        self.multiple_persons = MultiplePersonsDetector()
        self.unattended_bag = UnattendedBagDetector()

    # ------------------------------------------------------------------
    # Camera registry
    # ------------------------------------------------------------------

    def register_camera(
        self,
        camera_id: str,
        model_path: str,
        location: str,
        conf_threshold: float = 0.5,
        restricted_zones: dict[str, list[list[tuple[float, float]]]] | None = None,
    ) -> None:
        if not camera_id:
            raise ValueError("camera_id is required")
        if not model_path:
            raise ValueError("model_path is required")
        if not location:
            raise ValueError("location is required")

        self.extractors[camera_id] = CCTVExtractor(
            model_path=model_path,
            camera_id=camera_id,
            location=location,
            conf_threshold=conf_threshold,
            restricted_zones=restricted_zones,
        )

    def unregister_camera(self, camera_id: str) -> None:
        self.extractors.pop(camera_id, None)

    def list_registered_cameras(self) -> list[str]:
        return sorted(self.extractors.keys())

    # ------------------------------------------------------------------
    # Frame processing
    # ------------------------------------------------------------------

    def process_cctv_frame(
        self,
        frame: Any,
        camera_id: str,
        override_location: str | None = None,
        conf_threshold: float | None = None,
        timestamp_override: str | None = None,
        include_debug: bool = False,
    ) -> dict:
        if frame is None:
            return {"results": [], "debug": {"error": "frame_is_none"}}

        if not camera_id:
            return {
                "results": [pipeline_error("camera_not_registered", "camera_id is required")],
                "debug": {"error": "camera_id_is_required"},
            }

        extractor = self.extractors.get(camera_id)
        if extractor is None:
            return {
                "results": [pipeline_error("camera_not_registered", f"No extractor registered for camera_id={camera_id}")],
                "debug": {"error": f"camera_not_registered:{camera_id}"},
            }

        try:
            inference = extractor.infer_frame(
                frame,
                conf_threshold=conf_threshold,
                timestamp_override=timestamp_override,
            )
        except (AttributeError, TypeError, ValueError, RuntimeError) as e:
            return {
                "results": [pipeline_error("cctv_frame_processing_failed", str(e))],
                "debug": {"error": f"cctv_frame_processing_failed:{e}"},
            }

        location = override_location or getattr(extractor, "location", "unknown")
        raw_detections = list(inference.get("detections", []))

        unattended_bag_detections = self.unattended_bag.build_detections(raw_detections, camera_id, location, timestamp_override)

        multi_detections = self.multiple_persons.build_detections(raw_detections, camera_id, location, timestamp_override)
        detections = self.zone_presence.suppress_repeated_entries(raw_detections, camera_id, location, timestamp_override)
        detections.extend(multi_detections)

        loitering_detections = self.loitering.build_detections(detections, camera_id, location, timestamp_override)
        detections.extend(loitering_detections)
        detections.extend(unattended_bag_detections)

        all_results: list[dict] = []
        for detection in detections:
            if not isinstance(detection, dict):
                continue
            normalized = dict(detection)
            normalized["camera_id"] = camera_id
            if override_location:
                normalized["location"] = override_location
            all_results.extend(self.process_cctv_input(normalized))

        debug = {}
        if include_debug:
            debug = {
                **inference.get("debug", {}),
                "direct_detection_count": len(raw_detections),
                "multiple_person_detection_count": len(multi_detections),
                "loitering_detection_count": len(loitering_detections),
                "unattended_bag_detection_count": len(unattended_bag_detections),
            }

        return {"results": all_results, "debug": debug}

    # ------------------------------------------------------------------
    # Input processors
    # ------------------------------------------------------------------

    def process_cctv_input(self, raw_detection: dict) -> list[dict]:
        if not isinstance(raw_detection, dict):
            return [pipeline_error("cctv_input_processing_failed", "raw_detection must be a dict")]
        try:
            events = process_cctv_detection(raw_detection)
        except (AttributeError, TypeError, ValueError) as e:
            return [pipeline_error("cctv_input_processing_failed", str(e))]
        return self.process_events(events, source_type="cctv_detection")

    def process_access_input(self, raw_log: dict) -> list[dict]:
        if not isinstance(raw_log, dict):
            return [pipeline_error("access_input_processing_failed", "raw_log must be a dict")]
        try:
            events = process_access_log(raw_log)
        except (AttributeError, TypeError, ValueError) as e:
            return [pipeline_error("access_input_processing_failed", str(e))]
        return self.process_events(events, source_type="access_log")

    def process_manual_input(self, raw_input: dict) -> list[dict]:
        if not isinstance(raw_input, dict):
            return [pipeline_error("manual_input_processing_failed", "raw_input must be a dict")]
        try:
            events = process_manual_event(raw_input)
        except (AttributeError, TypeError, ValueError) as e:
            return [pipeline_error("manual_input_processing_failed", str(e))]
        return self.process_events(events, source_type="manual_event")

    def process_events(self, events: list[Any], source_type: str = "unknown") -> list[dict]:
        if not events:
            return []

        try:
            for event in events:
                self.processor.add_event(event)
        except (AttributeError, TypeError, ValueError) as e:
            return [pipeline_error("event_buffering_failed", str(e))]

        try:
            buffered_events = self.processor.get_events()
            incidents = self.engine.detect_incidents(buffered_events)
        except Exception as e:
            return [pipeline_error("incident_detection_failed", str(e))]

        results: list[dict] = []
        for incident in incidents:
            try:
                incident_dict = incident.to_dict()
            except (AttributeError, TypeError, ValueError) as e:
                results.append(pipeline_error("incident_serialization_failed", str(e)))
                continue

            normalized_incident = self._normalize_incident_data(incident_dict)
            advisory = normalize_advisory(
                build_advisory(normalized_incident, self.enable_advisory),
                normalized_incident,
            )
            results.append({
                "is_system_error": False,
                "status": "ok",
                "source_type": source_type,
                "incident_data": normalized_incident,
                "advisory": advisory,
            })

        return results

    # ------------------------------------------------------------------
    # Utilities
    # ------------------------------------------------------------------

    def _normalize_incident_data(self, incident_dict: dict) -> dict:
        if not isinstance(incident_dict, dict):
            return {
                "name": "unknown_incident",
                "location": "unknown",
                "timestamp": "",
                "triggering_events": [],
                "risk_score": 0,
                "description": "",
                "status": "NEW",
            }
        return {
            "name": incident_dict.get("name", "unknown_incident"),
            "location": incident_dict.get("location", "unknown"),
            "timestamp": incident_dict.get("timestamp", ""),
            "triggering_events": incident_dict.get("triggering_events", []),
            "risk_score": incident_dict.get("risk_score", 0),
            "description": incident_dict.get("description", ""),
            "status": incident_dict.get("status", "NEW"),
        }

    def get_buffered_events(self) -> list[dict]:
        try:
            return [event.to_dict() for event in self.processor.get_events()]
        except (AttributeError, TypeError, ValueError):
            return []

    def reset_state(self) -> None:
        if hasattr(self.processor, "event_buffer"):
            self.processor.event_buffer.clear()
        self.engine.recent_incidents.clear()
        self.engine.used_event_keys.clear()
        self.loitering.clear()
        self.zone_presence.clear()
        self.multiple_persons.clear()
        self.unattended_bag.clear()
        for extractor in self.extractors.values():
            if hasattr(extractor, "fight_detection_service"):
                extractor.fight_detection_service.reset()
from __future__ import annotations

from typing import Any

from adapters.access_log_adapter import process_access_log
from adapters.cctv_adapter import process_cctv_detection
from core.event_stream_processor import EventStreamProcessor
from core.incident_engine import IncidentEngine
from extractors.cctv_extractor import CCTVExtractor

try:
    from recommendation_AI.incident_analysis import get_advisory
except ImportError:
    get_advisory = None


class PipelineService:
    def __init__(
        self,
        window_seconds: int = 120,
        rules_file: str | None = None,
        enable_advisory: bool = True,
    ):
        self.window_seconds = window_seconds
        self.processor = EventStreamProcessor(window_seconds=window_seconds)
        self.engine = IncidentEngine(
            rules_file=rules_file,
            consumed_retention_seconds=window_seconds,
        )
        self.enable_advisory = enable_advisory

        # camera_id -> CCTVExtractor
        self.extractors: dict[str, CCTVExtractor] = {}

    # ------------------------------------------------------------------
    # Camera registration
    # ------------------------------------------------------------------

    def register_camera(
        self,
        camera_id: str,
        model_path: str,
        location: str,
        conf_threshold: float = 0.6,
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
        )

    def unregister_camera(self, camera_id: str) -> None:
        self.extractors.pop(camera_id, None)

    def list_registered_cameras(self) -> list[str]:
        return sorted(self.extractors.keys())

    # ------------------------------------------------------------------
    # CCTV: raw frame -> extractor -> detections -> incidents
    # ------------------------------------------------------------------

    def process_cctv_frame(
        self,
        frame: Any,
        camera_id: str,
        override_location: str | None = None,
        conf_threshold: float | None = None,
    ) -> list[dict]:
        """
        Process a raw CCTV frame by:
        1. finding the registered extractor for camera_id
        2. running YOLO inference via CCTVExtractor.extract_detections()
        3. converting each detection to events using process_cctv_input()
        4. passing through the normal event -> incident pipeline
        """
        if frame is None:
            return []

        if not camera_id:
            return [
                self._pipeline_error(
                    "camera_not_registered",
                    "camera_id is required",
                )
            ]

        extractor = self.extractors.get(camera_id)
        if extractor is None:
            return [
                self._pipeline_error(
                    "camera_not_registered",
                    f"No extractor registered for camera_id={camera_id}",
                )
            ]

        try:
            detections = extractor.extract_detections(
                frame,
                conf_threshold=conf_threshold,
            )
        except (AttributeError, TypeError, ValueError, RuntimeError) as e:
            return [self._pipeline_error("cctv_frame_processing_failed", str(e))]

        if not detections:
            return []

        all_results: list[dict] = []

        for detection in detections:
            if not isinstance(detection, dict):
                continue

            normalized_detection = dict(detection)

            # Ensure camera_id stays consistent with the registered camera
            normalized_detection["camera_id"] = camera_id

            # Optional location override from request
            if override_location:
                normalized_detection["location"] = override_location

            results = self.process_cctv_input(normalized_detection)
            all_results.extend(results)

        return all_results

    # ------------------------------------------------------------------
    # CCTV: detection payload -> events -> incidents
    # ------------------------------------------------------------------

    def process_cctv_input(self, raw_detection: dict) -> list[dict]:
        if not isinstance(raw_detection, dict):
            return [
                self._pipeline_error(
                    "cctv_input_processing_failed",
                    "raw_detection must be a dict",
                )
            ]

        try:
            events = process_cctv_detection(raw_detection)
        except (AttributeError, TypeError, ValueError) as e:
            return [self._pipeline_error("cctv_input_processing_failed", str(e))]

        return self.process_events(events, source_type="cctv_detection")

    # ------------------------------------------------------------------
    # Access logs -> events -> incidents
    # ------------------------------------------------------------------

    def process_access_input(self, raw_log: dict) -> list[dict]:
        if not isinstance(raw_log, dict):
            return [
                self._pipeline_error(
                    "access_input_processing_failed",
                    "raw_log must be a dict",
                )
            ]

        try:
            events = process_access_log(raw_log)
        except (AttributeError, TypeError, ValueError) as e:
            return [self._pipeline_error("access_input_processing_failed", str(e))]

        return self.process_events(events, source_type="access_log")

    # ------------------------------------------------------------------
    # Shared event processing
    # ------------------------------------------------------------------

    def process_events(self, events: list[Any], source_type: str = "unknown") -> list[dict]:
        if not events:
            return []

        try:
            for event in events:
                self.processor.add_event(event)
        except (AttributeError, TypeError, ValueError) as e:
            return [self._pipeline_error("event_buffering_failed", str(e))]

        try:
            buffered_events = self.processor.get_events()
            incidents = self.engine.detect_incidents(buffered_events)
        except Exception as e:
            return [self._pipeline_error("incident_detection_failed", str(e))]

        results: list[dict] = []

        for incident in incidents:
            try:
                incident_dict = incident.to_dict()
            except (AttributeError, TypeError, ValueError) as e:
                results.append(
                    self._pipeline_error(
                        "incident_serialization_failed",
                        str(e),
                    )
                )
                continue

            normalized_incident = self._normalize_incident_data(incident_dict)
            advisory = self._normalize_advisory(
                self._build_advisory(normalized_incident),
                normalized_incident,
            )

            results.append(
                {
                    "is_system_error": False,
                    "status": "ok",
                    "source_type": source_type,
                    "incident_data": normalized_incident,
                    "advisory": advisory,
                }
            )

        return results

    # ------------------------------------------------------------------
    # Advisory helpers
    # ------------------------------------------------------------------

    def _build_advisory(self, incident_dict: dict) -> dict:
        if not self.enable_advisory or get_advisory is None:
            return self._fallback_advisory(
                incident_dict,
                "Recommendation engine disabled or unavailable.",
            )

        try:
            advisory = get_advisory(incident_dict)
        except Exception as e:
            return self._fallback_advisory(
                incident_dict,
                f"Recommendation engine failed: {str(e)}",
            )

        if not isinstance(advisory, dict):
            return self._fallback_advisory(
                incident_dict,
                "Recommendation engine returned invalid response.",
            )

        return advisory

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

    def _normalize_advisory(self, advisory: dict, incident_dict: dict) -> dict:
        if not isinstance(advisory, dict):
            return self._fallback_advisory(
                incident_dict,
                "Advisory output was invalid.",
            )

        return {
            "title": advisory.get("title", "Incident Advisory"),
            "flag": advisory.get("flag", "Green"),
            "location": advisory.get("location", incident_dict.get("location", "unknown")),
            "dispatch_unit": advisory.get("dispatch_unit", "Manual Review"),
            "expected_response_time": advisory.get(
                "expected_response_time",
                "Routine check (< 1 hour)",
            ),
            "description": advisory.get(
                "description",
                incident_dict.get("description", ""),
            ),
            "explanation": advisory.get(
                "explanation",
                "No detailed explanation provided.",
            ),
            "actions": advisory.get("actions", ["Review incident manually"]),
        }

    def _fallback_advisory(self, incident_dict: dict, reason: str) -> dict:
        return {
            "title": "Analysis Unavailable",
            "flag": "Green",
            "location": incident_dict.get("location", "unknown"),
            "dispatch_unit": "Manual Review",
            "expected_response_time": "Routine check (< 1 hour)",
            "description": reason,
            "explanation": "Fallback response due to unavailable AI analysis.",
            "actions": [
                "Verify source data manually",
                "Review CCTV and logs",
                "Escalate to supervisor if needed",
            ],
        }

    # ------------------------------------------------------------------
    # Errors / utilities
    # ------------------------------------------------------------------

    def _pipeline_error(self, error_type: str, message: str) -> dict:
        return {
            "is_system_error": True,
            "status": "error",
            "source_type": "system",
            "incident_data": {
                "name": "pipeline_error",
                "location": "system",
                "timestamp": "",
                "triggering_events": [],
                "risk_score": 0,
                "description": error_type,
                "status": "ERROR",
            },
            "advisory": {
                "title": "Pipeline Error",
                "flag": "Green",
                "location": "system",
                "dispatch_unit": "Developer Review",
                "expected_response_time": "As needed",
                "description": message,
                "explanation": f"System error occurred during {error_type}.",
                "actions": [
                    "Check logs",
                    "Inspect input payload",
                    "Review stack trace",
                ],
            },
        }

    def get_buffered_events(self) -> list[dict]:
        try:
            return [event.to_dict() for event in self.processor.get_events()]
        except (AttributeError, TypeError, ValueError):
            return []
import argparse
import base64
from pathlib import Path

import cv2
import requests


def frame_to_base64(frame) -> str:
    ok, buffer = cv2.imencode(".jpg", frame)
    if not ok:
        raise RuntimeError("Failed to encode frame as JPEG")

    return base64.b64encode(buffer).decode("utf-8")


def print_incidents(data: dict) -> None:
    if data.get("incidents_created", 0) <= 0:
        return

    print("INCIDENT CREATED:")

    for result in data.get("results", []):
        incident_data = result.get("incident_data", {})
        if not incident_data:
            continue

        print("  name:", incident_data.get("name"))
        print("  location:", incident_data.get("location"))
        print("  triggering_events:")

        for event in incident_data.get("triggering_events", []):
            print("   -", event.get("event_type"), event.get("timestamp"))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", required=True, help="Path to video file")
    parser.add_argument(
        "--api-url",
        default="http://127.0.0.1:8000/api/pipeline/cctv/frame",
        help="Backend CCTV frame endpoint",
    )
    parser.add_argument("--camera-id", default="cam_01")
    parser.add_argument("--location", default="server_room")
    parser.add_argument("--confidence-threshold", type=float, default=0.5)
    parser.add_argument(
        "--every-seconds",
        type=float,
        default=1.0,
        help="Send one frame every N seconds",
    )
    parser.add_argument(
        "--reset-url",
        default="http://127.0.0.1:8000/api/demo/reset",
        help="Demo reset endpoint",
    )
    parser.add_argument(
        "--no-reset",
        action="store_true",
        help="Skip demo reset before testing",
    )

    args = parser.parse_args()

    video_path = Path(args.video)

    if not video_path.exists():
        raise FileNotFoundError(f"Video not found: {video_path}")

    if not args.no_reset:
        try:
            reset_res = requests.post(args.reset_url, timeout=10)
            print("Reset status:", reset_res.status_code)
        except requests.RequestException as e:
            print("Warning: reset failed:", e)

    cap = cv2.VideoCapture(str(video_path))

    if not cap.isOpened():
        raise RuntimeError(f"Could not open video: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS)
    if not fps or fps <= 0:
        fps = 30

    interval = max(1, int(fps * args.every_seconds))

    frame_index = 0
    sent_count = 0
    multiple_person_hits = 0
    fight_hits = 0

    print("\nTesting video:", video_path)
    print("FPS:", fps)
    print("Sending one frame every", args.every_seconds, "second(s)")
    print("-" * 140)

    while True:
        ok, frame = cap.read()
        if not ok:
            break

        if frame_index % interval == 0:
            timestamp = f"2026-05-14T12:00:{sent_count:02d}"

            payload = {
                "image_base64": frame_to_base64(frame),
                "camera_id": args.camera_id,
                "location": args.location,
                "confidence_threshold": args.confidence_threshold,
                "timestamp": timestamp,
                "include_debug": True,
            }

            try:
                res = requests.post(args.api_url, json=payload, timeout=60)
                res.raise_for_status()
                data = res.json()
            except requests.RequestException as e:
                print(f"sample={sent_count:02d} | REQUEST FAILED:", e)
                sent_count += 1
                frame_index += 1
                continue

            debug = data.get("debug", {})

            direct = debug.get("direct_detection_count")
            person_count = debug.get("person_count")
            multiple_person = debug.get("multiple_person_detection_count", 0)

            fight_mode = debug.get("fight_mode")
            fight_source = debug.get("fight_source")
            fight_class = debug.get("fight_class")
            fight_confidence = debug.get("fight_confidence")
            fight_is_fighting = debug.get("fight_is_fighting")
            fight_frame_positive = debug.get("fight_frame_positive")
            fight_frames_sent = debug.get("fight_frames_sent")
            fight_buffer_size = debug.get("fight_buffer_size")
            fight_error = debug.get("fight_error")
            fight_votes = debug.get("fight_votes")
            fight_window_size = debug.get("fight_window_size")

            incidents_created = data.get("incidents_created", 0)

            if multiple_person:
                multiple_person_hits += multiple_person

            if fight_is_fighting:
                fight_hits += 1

            if isinstance(fight_confidence, float):
                fight_confidence_text = f"{fight_confidence:.3f}"
            else:
                fight_confidence_text = str(fight_confidence)

            print(
                f"sample={sent_count:02d} | "
                f"direct={direct} | "
                f"person_count={person_count} | "
                f"multiple_person={multiple_person} | "
                f"fight_mode={fight_mode} | "
                f"fight_source={fight_source} | "
                f"fight_class={fight_class} | "
                f"fight_conf={fight_confidence_text} | "
                f"fight_is_fighting={fight_is_fighting} | "
                f"fight_positive={fight_frame_positive} | "
                f"fight_votes={fight_votes}/{fight_window_size} | "
                f"fight_buffer={fight_buffer_size} | "
                f"fight_frames_sent={fight_frames_sent} | "
                f"fight_error={fight_error} | "
                f"incidents_created={incidents_created}"
            )

            print_incidents(data)

            sent_count += 1

        frame_index += 1

    cap.release()

    print("-" * 140)
    print("Summary")
    print("frames_sent:", sent_count)
    print("multiple_person_hits:", multiple_person_hits)
    print("fight_positive_hits:", fight_hits)


if __name__ == "__main__":
    main()
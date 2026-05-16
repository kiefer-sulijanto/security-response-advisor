import argparse
import base64
import csv
import statistics
import time
from pathlib import Path

import cv2
import requests


def frame_to_base64(frame, jpeg_quality=80) -> str:
    ok, buffer = cv2.imencode(
        ".jpg",
        frame,
        [int(cv2.IMWRITE_JPEG_QUALITY), jpeg_quality],
    )

    if not ok:
        raise RuntimeError("Failed to encode frame as JPEG")

    return base64.b64encode(buffer).decode("utf-8")


def print_incidents(data: dict) -> list[str]:
    incident_names = []

    for result in data.get("results", []):
        incident_data = result.get("incident_data", {})
        if incident_data:
            name = incident_data.get("name")
            if name:
                incident_names.append(name)

    return incident_names


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", required=True, help="Path to test video")
    parser.add_argument(
        "--api-url",
        default="http://127.0.0.1:8000/api/pipeline/cctv/frame",
    )
    parser.add_argument(
        "--reset-url",
        default="http://127.0.0.1:8000/api/demo/reset",
    )
    parser.add_argument("--camera-id", default="cam_01")
    parser.add_argument("--location", default="server_room")
    parser.add_argument("--confidence-threshold", type=float, default=0.5)
    parser.add_argument("--every-seconds", type=float, default=1.0)
    parser.add_argument("--timeout", type=float, default=90)
    parser.add_argument("--jpeg-quality", type=int, default=80)
    parser.add_argument("--output-csv", default="full_backend_benchmark.csv")
    parser.add_argument("--no-reset", action="store_true")
    args = parser.parse_args()

    video_path = Path(args.video)

    if not video_path.exists():
        raise FileNotFoundError(f"Video not found: {video_path}")

    if not args.no_reset:
        try:
            reset_start = time.perf_counter()
            reset_res = requests.post(args.reset_url, timeout=20)
            reset_elapsed = time.perf_counter() - reset_start
            print(f"Reset status: {reset_res.status_code} ({reset_elapsed:.3f}s)")
        except requests.RequestException as e:
            print("Warning: reset failed:", e)

    cap = cv2.VideoCapture(str(video_path))

    if not cap.isOpened():
        raise RuntimeError(f"Could not open video: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    interval = max(1, int(fps * args.every_seconds))

    frame_index = 0
    sent_count = 0
    failures = 0

    rows = []
    total_latencies = []
    incident_latencies = []
    non_incident_latencies = []

    print("\nBenchmarking full backend CCTV flow")
    print("Video:", video_path)
    print("API:", args.api_url)
    print("Sampling:", args.every_seconds, "second(s)")
    print("-" * 160)

    while True:
        ok, frame = cap.read()
        if not ok:
            break

        if frame_index % interval == 0:
            timestamp = f"2026-05-14T12:00:{sent_count:02d}"

            encode_start = time.perf_counter()
            image_base64 = frame_to_base64(frame, jpeg_quality=args.jpeg_quality)
            encode_elapsed = time.perf_counter() - encode_start

            payload = {
                "image_base64": image_base64,
                "camera_id": args.camera_id,
                "location": args.location,
                "confidence_threshold": args.confidence_threshold,
                "timestamp": timestamp,
                "include_debug": True,
            }

            request_start = time.perf_counter()

            try:
                res = requests.post(
                    args.api_url,
                    json=payload,
                    timeout=args.timeout,
                )
                request_elapsed = time.perf_counter() - request_start
                res.raise_for_status()
                data = res.json()

                debug = data.get("debug", {})
                incidents_created = data.get("incidents_created", 0)
                incident_names = print_incidents(data)

                total_latencies.append(request_elapsed)

                if incidents_created:
                    incident_latencies.append(request_elapsed)
                else:
                    non_incident_latencies.append(request_elapsed)

                row = {
                    "sample": sent_count,
                    "timestamp": timestamp,
                    "encode_seconds": encode_elapsed,
                    "request_seconds": request_elapsed,
                    "status": "ok",
                    "direct_detection_count": debug.get("direct_detection_count"),
                    "person_count": debug.get("person_count"),
                    "multiple_person_detection_count": debug.get("multiple_person_detection_count"),
                    "loitering_detection_count": debug.get("loitering_detection_count"),
                    "fight_mode": debug.get("fight_mode"),
                    "fight_source": debug.get("fight_source"),
                    "fight_class": debug.get("fight_class"),
                    "fight_confidence": debug.get("fight_confidence"),
                    "fight_is_fighting": debug.get("fight_is_fighting"),
                    "fight_buffer_size": debug.get("fight_buffer_size"),
                    "fight_frames_sent": debug.get("fight_frames_sent"),
                    "fight_error": debug.get("fight_error"),
                    "incidents_created": incidents_created,
                    "incident_names": ";".join(incident_names),
                    "error": "",
                }
                rows.append(row)

                print(
                    f"sample={sent_count:02d} | "
                    f"request={request_elapsed:.3f}s | "
                    f"encode={encode_elapsed:.3f}s | "
                    f"persons={debug.get('person_count')} | "
                    f"direct={debug.get('direct_detection_count')} | "
                    f"fight_mode={debug.get('fight_mode')} | "
                    f"fight_source={debug.get('fight_source')} | "
                    f"fight_class={debug.get('fight_class')} | "
                    f"fight_conf={debug.get('fight_confidence')} | "
                    f"fight={debug.get('fight_is_fighting')} | "
                    f"frames_sent={debug.get('fight_frames_sent')} | "
                    f"incidents={incidents_created} | "
                    f"names={incident_names}"
                )

            except Exception as e:
                request_elapsed = time.perf_counter() - request_start
                failures += 1

                rows.append({
                    "sample": sent_count,
                    "timestamp": timestamp,
                    "encode_seconds": encode_elapsed,
                    "request_seconds": request_elapsed,
                    "status": "failed",
                    "direct_detection_count": None,
                    "person_count": None,
                    "multiple_person_detection_count": None,
                    "loitering_detection_count": None,
                    "fight_mode": None,
                    "fight_source": None,
                    "fight_class": None,
                    "fight_confidence": None,
                    "fight_is_fighting": None,
                    "fight_buffer_size": None,
                    "fight_frames_sent": None,
                    "fight_error": None,
                    "incidents_created": 0,
                    "incident_names": "",
                    "error": str(e),
                })

                print(
                    f"sample={sent_count:02d} | "
                    f"FAILED after {request_elapsed:.3f}s | "
                    f"error={e}"
                )

            sent_count += 1

        frame_index += 1

    cap.release()

    if rows:
        with open(args.output_csv, "w", newline="", encoding="utf-8") as file:
            writer = csv.DictWriter(file, fieldnames=list(rows[0].keys()))
            writer.writeheader()
            writer.writerows(rows)

    print("-" * 160)
    print("Summary")
    print("frames_sent:", sent_count)
    print("failures:", failures)
    print("csv:", args.output_csv)

    def summarize(label, values):
        if not values:
            print(f"{label}: no data")
            return

        print(f"{label}:")
        print(f"  avg: {statistics.mean(values):.3f}s")
        print(f"  min: {min(values):.3f}s")
        print(f"  max: {max(values):.3f}s")
        if len(values) >= 2:
            print(f"  stdev: {statistics.stdev(values):.3f}s")

    summarize("all requests", total_latencies)
    summarize("non-incident requests", non_incident_latencies)
    summarize("incident-created requests", incident_latencies)


if __name__ == "__main__":
    main()
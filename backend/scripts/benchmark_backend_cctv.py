import argparse
import base64
import statistics
import time
from pathlib import Path

import cv2
import requests


def frame_to_base64(frame) -> str:
    ok, buffer = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
    if not ok:
        raise RuntimeError("Failed to encode frame")
    return base64.b64encode(buffer).decode("utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", required=True)
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
    parser.add_argument("--every-seconds", type=float, default=1.0)
    parser.add_argument("--timeout", type=float, default=30)
    parser.add_argument("--no-reset", action="store_true")
    args = parser.parse_args()

    if not args.no_reset:
        try:
            reset = requests.post(args.reset_url, timeout=10)
            print("Reset status:", reset.status_code)
        except Exception as e:
            print("Reset failed:", e)

    video_path = Path(args.video)
    cap = cv2.VideoCapture(str(video_path))

    if not cap.isOpened():
        raise RuntimeError(f"Could not open video: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    interval = max(1, int(fps * args.every_seconds))

    frame_index = 0
    sent_count = 0
    latencies = []
    failures = 0

    print("\nBenchmarking backend CCTV endpoint")
    print("Video:", video_path)
    print("API:", args.api_url)
    print("-" * 120)

    while True:
        ok, frame = cap.read()
        if not ok:
            break

        if frame_index % interval == 0:
            payload = {
                "image_base64": frame_to_base64(frame),
                "camera_id": args.camera_id,
                "location": args.location,
                "confidence_threshold": 0.5,
                "timestamp": f"2026-05-14T12:00:{sent_count:02d}",
                "include_debug": True,
            }

            start = time.perf_counter()

            try:
                res = requests.post(args.api_url, json=payload, timeout=args.timeout)
                elapsed = time.perf_counter() - start
                res.raise_for_status()
                data = res.json()
                debug = data.get("debug", {})

                latencies.append(elapsed)

                print(
                    f"sample={sent_count:02d} | "
                    f"time={elapsed:.3f}s | "
                    f"person_count={debug.get('person_count')} | "
                    f"fight_mode={debug.get('fight_mode')} | "
                    f"fight_source={debug.get('fight_source')} | "
                    f"fight_class={debug.get('fight_class')} | "
                    f"fight_conf={debug.get('fight_confidence')} | "
                    f"fight_is_fighting={debug.get('fight_is_fighting')} | "
                    f"fight_buffer={debug.get('fight_buffer_size')} | "
                    f"fight_frames_sent={debug.get('fight_frames_sent')} | "
                    f"fight_error={debug.get('fight_error')} | "
                    f"incidents_created={data.get('incidents_created')}"
                )

            except Exception as e:
                elapsed = time.perf_counter() - start
                failures += 1
                print(f"sample={sent_count:02d} | FAILED after {elapsed:.3f}s | error={e}")

            sent_count += 1

        frame_index += 1

    cap.release()

    print("-" * 120)
    print("Summary")
    print("frames_sent:", sent_count)
    print("failures:", failures)

    if latencies:
        print(f"avg latency: {statistics.mean(latencies):.3f}s")
        print(f"min latency: {min(latencies):.3f}s")
        print(f"max latency: {max(latencies):.3f}s")
        if len(latencies) >= 2:
            print(f"stdev latency: {statistics.stdev(latencies):.3f}s")


if __name__ == "__main__":
    main()
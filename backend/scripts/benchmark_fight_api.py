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


def sample_frames_from_video(video_path: Path, frame_count: int):
    cap = cv2.VideoCapture(str(video_path))

    if not cap.isOpened():
        raise RuntimeError(f"Could not open video: {video_path}")

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    if total_frames <= 0:
        raise RuntimeError("Video has no frames")

    indices = [
        int(i * (total_frames - 1) / max(frame_count - 1, 1))
        for i in range(frame_count)
    ]

    frames = []

    for index in indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, index)
        ok, frame = cap.read()

        if ok and frame is not None:
            frames.append(frame)

    cap.release()

    if not frames:
        raise RuntimeError("No frames sampled from video")

    while len(frames) < frame_count:
        frames.append(frames[-1])

    return frames[:frame_count]


def benchmark_api(api_url: str, frames_base64: list[str], runs: int, timeout: float):
    latencies = []
    failures = 0
    last_response = None

    payload = {
        "camera_id": "benchmark_cam",
        "frames_base64": frames_base64,
    }

    payload_size_mb = len(str(payload).encode("utf-8")) / (1024 * 1024)

    print(f"\nTesting API: {api_url}")
    print(f"Runs: {runs}")
    print(f"Frames per request: {len(frames_base64)}")
    print(f"Approx payload size: {payload_size_mb:.2f} MB")
    print("-" * 80)

    for i in range(1, runs + 1):
        start = time.perf_counter()

        try:
            res = requests.post(api_url, json=payload, timeout=timeout)
            elapsed = time.perf_counter() - start
            res.raise_for_status()

            data = res.json()
            last_response = data
            latencies.append(elapsed)

            print(
                f"run={i:02d} | "
                f"time={elapsed:.3f}s | "
                f"class={data.get('class_name')} | "
                f"conf={data.get('confidence')} | "
                f"is_fighting={data.get('is_fighting')} | "
                f"source={data.get('source')}"
            )

        except Exception as e:
            elapsed = time.perf_counter() - start
            failures += 1
            print(f"run={i:02d} | FAILED after {elapsed:.3f}s | error={e}")

    print("-" * 80)

    if latencies:
        print("Latency summary:")
        print(f"  avg: {statistics.mean(latencies):.3f}s")
        print(f"  min: {min(latencies):.3f}s")
        print(f"  max: {max(latencies):.3f}s")

        if len(latencies) >= 2:
            print(f"  stdev: {statistics.stdev(latencies):.3f}s")

    print(f"Failures: {failures}/{runs}")

    if last_response:
        print("\nLast response:")
        print(last_response)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--api-url", required=True, help="Fight AI API URL")
    parser.add_argument("--video", required=True, help="Video used to sample frames")
    parser.add_argument("--frames", type=int, default=16)
    parser.add_argument("--runs", type=int, default=10)
    parser.add_argument("--timeout", type=float, default=15)
    args = parser.parse_args()

    video_path = Path(args.video)

    frames = sample_frames_from_video(video_path, args.frames)
    frames_base64 = [frame_to_base64(frame) for frame in frames]

    benchmark_api(
        api_url=args.api_url,
        frames_base64=frames_base64,
        runs=args.runs,
        timeout=args.timeout,
    )


if __name__ == "__main__":
    main()
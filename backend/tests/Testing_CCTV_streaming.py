from pathlib import Path
import sys

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from pathlib import Path
import time
import cv2

from extractors import CCTVExtractor
from services import PipelineService


# =========================
# CONFIG
# =========================
BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent

# Choose one source:
VIDEO_SOURCE = 0  # webcam
#VIDEO_SOURCE = str(BASE_DIR / "test_video.mp4")  # local file
# VIDEO_SOURCE = "rtsp://username:password@camera-ip:554/stream"  # RTSP stream
# VIDEO_SOURCE = "http://ip-address:port/video"  # HTTP/MJPEG stream

MODEL_PATH = str(PROJECT_ROOT / "models" / "best.pt")
CAMERA_ID = "cam_live_01"
LOCATION = "server_room"
FRAME_SKIP = 10
RECONNECT_DELAY_SECONDS = 2
MAX_CONSECUTIVE_READ_FAILURES = 20
SHOW_WINDOW = True
ENABLE_ADVISORY = True


class LiveStreamRunner:
    def __init__(
        self,
        video_source,
        model_path,
        camera_id,
        location,
        frame_skip=10,
        enable_advisory=True,
        show_window=True,
        reconnect_delay_seconds=2,
        max_consecutive_read_failures=20,
    ):
        self.video_source = video_source
        self.frame_skip = max(1, int(frame_skip))
        self.show_window = show_window
        self.reconnect_delay_seconds = reconnect_delay_seconds
        self.max_consecutive_read_failures = max_consecutive_read_failures

        self.extractor = CCTVExtractor(
            model_path=model_path,
            camera_id=camera_id,
            location=location,
        )
        self.pipeline = PipelineService(enable_advisory=enable_advisory)

        self.cap = None
        self.frame_count = 0
        self.consecutive_read_failures = 0

    def open_stream(self):
        self.cap = cv2.VideoCapture(self.video_source)
        if not self.cap.isOpened():
            self.cap.release()
            self.cap = None
            return False
        return True

    def close_stream(self):
        if self.cap is not None:
            self.cap.release()
            self.cap = None

    def reconnect_stream(self):
        print(f"[INFO] Reconnecting in {self.reconnect_delay_seconds} second(s)...")
        self.close_stream()
        time.sleep(self.reconnect_delay_seconds)
        return self.open_stream()

    def process_frame(self, frame):
        try:
            detections = self.extractor.extract_detections(frame)
        except Exception as e:
            print(f"[WARNING] Detection failed: {e}")
            return

        if not detections:
            return

        for detection in detections:
            try:
                results = self.pipeline.process_cctv_input(detection)
            except Exception as e:
                print(f"[WARNING] Pipeline processing failed: {e}")
                continue

            if not results:
                continue

            print("\n🚨 INCIDENT DETECTED:")
            for result in results:
                print(result)

    def run(self):
        if not self.open_stream():
            raise RuntimeError(f"Unable to open video source: {self.video_source}")

        print(f"[INFO] Stream started: {self.video_source}")
        print("[INFO] Press 'q' to quit.")

        try:
            while True:
                ret, frame = self.cap.read()

                if not ret or frame is None:
                    self.consecutive_read_failures += 1
                    print(f"[WARNING] Frame read failed ({self.consecutive_read_failures}/{self.max_consecutive_read_failures})")

                    if self.consecutive_read_failures >= self.max_consecutive_read_failures:
                        reconnected = self.reconnect_stream()
                        self.consecutive_read_failures = 0

                        if not reconnected:
                            print("[ERROR] Reconnection failed. Stopping stream.")
                            break
                    continue

                self.consecutive_read_failures = 0
                self.frame_count += 1

                if self.frame_count % self.frame_skip == 0:
                    self.process_frame(frame)

                if self.show_window:
                    cv2.imshow("Security Live Stream", frame)
                    if cv2.waitKey(1) & 0xFF == ord("q"):
                        break

        finally:
            self.close_stream()
            if self.show_window:
                cv2.destroyAllWindows()
            print("[INFO] Stream stopped.")


if __name__ == "__main__":
    runner = LiveStreamRunner(
        video_source=VIDEO_SOURCE,
        model_path=MODEL_PATH,
        camera_id=CAMERA_ID,
        location=LOCATION,
        frame_skip=FRAME_SKIP,
        enable_advisory=ENABLE_ADVISORY,
        show_window=SHOW_WINDOW,
        reconnect_delay_seconds=RECONNECT_DELAY_SECONDS,
        max_consecutive_read_failures=MAX_CONSECUTIVE_READ_FAILURES,
    )
    runner.run()

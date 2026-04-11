from pathlib import Path
import sys

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))
    
from pathlib import Path

import cv2
from extractors import CCTVExtractor
from adapters import process_cctv_detection
from services import PipelineService

PROJECT_ROOT = Path(__file__).resolve().parent.parent

extractor = CCTVExtractor(
    model_path=str(PROJECT_ROOT / "models" / "best.pt"),
    camera_id="cam_01",
    location="server_room"
)

service = PipelineService()

cap = cv2.VideoCapture(str(PROJECT_ROOT / "tests" / "test_video.mp4"))

frame_count = 0

while True:
    ret, frame = cap.read()
    if not ret:
        break

    frame_count += 1

    # sample every 10th frame
    if frame_count % 10 != 0:
        continue

    detections = extractor.extract_detections(frame)

    for detection in detections:
        events = process_cctv_detection(detection)
        results = service.process_events(events)

        if results:
            print("\n🚨 INCIDENT DETECTED:")
            for r in results:
                print(r)

cap.release()

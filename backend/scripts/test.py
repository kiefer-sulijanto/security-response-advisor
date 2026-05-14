import base64
import requests
from pathlib import Path

FRIEND_API = "http://172.20.10.3:9000/predict-fight-clip"

image_path = Path("test.jpg")
image_base64 = base64.b64encode(image_path.read_bytes()).decode("utf-8")

payload = {
    "camera_id": "cam_01",
    "frames_base64": [image_base64] * 8,
}

res = requests.post(FRIEND_API, json=payload, timeout=30)
print(res.status_code)
print(res.json())
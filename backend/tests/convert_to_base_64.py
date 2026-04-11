import base64
import requests

IMAGE_PATH = "tests/test.jpg"  
API_URL = "http://127.0.0.1:8000/api/pipeline/cctv/frame"

with open(IMAGE_PATH, "rb") as f:
    image_base64 = base64.b64encode(f.read()).decode("utf-8")

payload = {
    "image_base64": image_base64,
    "camera_id": "cam_sim_01",
    "location": "server_room",
    "confidence_threshold": 0.6
}

response = requests.post(API_URL, json=payload)

print("Status code:", response.status_code)
print("Response JSON:")
print(response.json())
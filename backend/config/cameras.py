CAMERA_REGISTRY = [
    {
        "camera_id": "cam_01",
        "model_path": "models/yolov8n.pt",
        "location": "server_room",
        "conf_threshold": 0.7,
        "restricted_zones": {
            "cam_01": []
        }
    },
    {
        "camera_id": "cam_02",
        "model_path": "models/yolov8n.pt",
        "location": "lobby",
        "conf_threshold": 0.7,
        "restricted_zones": {
            "cam_02": []
        }
    },
    {
        "camera_id": "cam_03",
        "model_path": "models/yolov8n.pt",
        "location": "main_gate",
        "conf_threshold": 0.7,
        "restricted_zones": {
            "cam_03": []
        }
    },
    {
        "camera_id": "cam_analysis_01",
        "model_path": "models/yolov8n.pt",
        "location": "analysis",
        "conf_threshold": 0.7,
        "restricted_zones": {
            "cam_analysis_01": []
        }
    }
]
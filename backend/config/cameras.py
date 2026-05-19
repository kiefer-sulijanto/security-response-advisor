CAMERA_REGISTRY = [
    {
        "camera_id": "cam_01",
        "name": "Server Room Camera",
        "model_path": "models/yolov8n.pt",
        "location": "server_room",
        "conf_threshold": 0.7,
        "restricted_zones": {
            "cam_01": []
        }
    },
    {
        "camera_id": "cam_02",
        "name": "Lobby Camera",
        "model_path": "models/yolov8n.pt",
        "location": "lobby",
        "conf_threshold": 0.7,
        "restricted_zones": {
            "cam_02": []
        }
    },
    {
        "camera_id": "cam_03",
        "name": "Gathering Area Camera",
        "model_path": "models/yolov8n.pt",
        "location": "gathering_area",
        "conf_threshold": 0.7,
        "restricted_zones": {
            "cam_03": []
        }
    },
    {
        "camera_id": "cam_analysis_01",
        "name": "Video Analysis Camera",
        "model_path": "models/yolov8n.pt",
        "location": "lobby",
        "conf_threshold": 0.7,
        "restricted_zones": {
            "cam_analysis_01": []
        }
    }
]
# Fight AI Service

This service runs the video-based fight detection model as a separate FastAPI inference service.

The main backend sends recent CCTV frames to this service. The service returns whether the clip is classified as fighting or normal.

## Folder Structure

```text
fight_ai_service/
  fight_api.py
  requirements.txt
  models/
    videomae_fight/
      config.json
      model.safetensors
      preprocessor_config.json
```

## Model Setup

The trained model files are not included in GitHub due to file size.

Download the model folder from google drive:

```text
https://drive.google.com/drive/folders/114LR8fLfBIzOhuc2fko7bHwhTfDgis86?usp=sharing
```

After downloading, place it here:
```
fight_ai_service/models
```

Expected structure:
```
fight_ai_service/
  models/
    videomae_fight/
      config.json
      model.safetensors
      preprocessor_config.json
```
## Setup 
Create a virtual environment:
```
python -m venv venv
```
Activate it:
```
venv/scripts/activate
```
Install dependencies:

```
pip install -r requirements.txt
```

For NVIDIA GPU support, install PyTorch with the matching CUDA wheel before installing the rest of the requirements, for example:

```
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu126
pip install -r requirements.txt
```

Running the Service:

```
uvicorn fight_api:app --host 0.0.0.0 --port 9000
```
Check that it is running:
```
http://127.0.0.1:9000/
```
If running on another device, replace `127.0.0.1` with that device's network ip

## Backend Configuration
In the main backend `.env`:

```
FIGHT_DETECTION_MODE=remote
FIGHT_CLASSIFIER_URL=http://127.0.0.1:9000/predict-fight-clip
FIGHT_CLIP_FRAME_COUNT=16
FIGHT_REMOTE_TIMEOUT_SECONDS=8
```

For remote laptop deployment:

```
FIGHT_CLASSIFIER_URL=http://<AI_LAPTOP_IP>:9000/predict-fight-clip
```




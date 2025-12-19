# Headtrack

Headtrack is a web app for detecting and tracking human heads in uploaded MP4 videos.
It uses a GPU-accelerated inference backend with a lightweight frontend overlay that
renders live head boxes and IDs in the browser.

## Key features

- Upload an MP4 and generate head tracks with persistent IDs.
- Live preview with canvas overlay synchronized to video playback.
- Optional export to an annotated MP4 with boxes + IDs burned in.
- GPU toggle for processing on CUDA or CPU.

## Tech stack

Frontend:

- React + Vite
- HTML5 video + canvas overlay
- Axios for API calls

Backend:

- FastAPI (Python 3.12)
- Ultralytics YOLOv8 (person class)
- ByteTrack for ID persistence
- OpenCV for video I/O
- PyTorch CUDA for GPU acceleration

## Project layout

```
backend/
  app.py
uploads/
  <job_id>.mp4
runs/
  <job_id>/
    tracks.json
    annotated.mp4
frontend/
  src/
```

## API endpoints

- `POST /api/upload` → upload MP4 and return `{ job_id }`
- `POST /api/process/{job_id}` → generate `tracks.json` (add `?use_gpu=0` for CPU)
- `GET /api/tracks/{job_id}` → download tracking JSON
- `POST /api/export/{job_id}` → generate `annotated.mp4`
- `GET /api/annotated/{job_id}` → download annotated video

## Local development

Backend:

```
cd backend
.\.venv\Scripts\python.exe -m uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

Frontend:

```
cd frontend
npm run dev -- --host --port 5173
```

One-command demo (starts both servers):

```
powershell -ExecutionPolicy Bypass -File .\run-demo.ps1
```

## Notes

- GPU (CUDA) is recommended for real-time or large videos.
- Tracking JSON FPS is adjusted to match `vid_stride` to keep overlay timing correct.

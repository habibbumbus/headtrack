# Headtrack

Web app for head tracking in uploaded MP4 videos.

## Architecture

- Backend: FastAPI + Ultralytics YOLOv8 (person class) + ByteTrack
- Frontend: React + Vite (video + canvas overlay)

## Backend endpoints

- `POST /api/upload` uploads an MP4 and returns a job id
- `POST /api/process/{job_id}` runs tracking and writes `runs/<job_id>/tracks.json`
- `GET /api/tracks/{job_id}` returns the tracking JSON
- `POST /api/export/{job_id}` (optional) writes `annotated.mp4`
- `GET /api/annotated/{job_id}` downloads the annotated video

## Local dev

Backend:

```
cd backend
.\.venv\Scripts\python.exe -m uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

Frontend:

```
cd frontend
npm run dev -- --host
```

## Notes

- GPU (CUDA) is required for fast inference.
- Tracking JSON FPS is adjusted to match `vid_stride`.

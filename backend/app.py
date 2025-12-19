import cv2
from ultralytics import YOLO
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import uuid
import shutil
import json
import torch,time


t0 = time.time()
x = torch.randn(4096, 4096, device="cuda")
y = x @ x
torch.cuda.synchronize()
print("CUDA matmul ms:", (time.time() - t0) * 1000)

print("CUDA available:", torch.cuda.is_available(), "CUDA:", torch.version.cuda)



# --- basic folders ---
ROOT = Path(__file__).resolve().parent.parent
UPLOADS = ROOT / "uploads"
RUNS = ROOT / "runs"
UPLOADS.mkdir(exist_ok=True)
RUNS.mkdir(exist_ok=True)

# --- app ---
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
model_gpu = YOLO("yolov8n.pt")  # downloads weights on first run
model_gpu.to("cuda")
model_cpu = None
print("Model device:", next(model_gpu.model.parameters()).device)
STRIDE = 2
# --- endpoints ---

@app.get("/ping")
def ping():
    return {"message": "pong"}

@app.post("/api/upload")
async def upload(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".mp4"):
        return JSONResponse({"error": "Only .mp4 files allowed"}, status_code=400)

    job_id = str(uuid.uuid4())
    video_path = UPLOADS / f"{job_id}.mp4"

    with video_path.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    return {"job_id": job_id}


@app.get("/api/video/{job_id}")
def get_video(job_id: str):
    video_path = UPLOADS / f"{job_id}.mp4"
    if not video_path.exists():
        return JSONResponse({"error": "Video not found"}, status_code=404)
    return FileResponse(str(video_path), media_type="video/mp4")

@app.get("/api/tracks/{job_id}")
def get_tracks(job_id: str):
    tracks_path = RUNS / job_id / "tracks.json"
    if not tracks_path.exists():
        return JSONResponse({"error": "Tracks not found. Run /api/process/{job_id} first."}, status_code=404)
    return FileResponse(str(tracks_path), media_type="application/json")
@app.post("/api/process/{job_id}")
def process(job_id: str, use_gpu: int = 1):
    video_path = UPLOADS / f"{job_id}.mp4"
    if not video_path.exists():
        return JSONResponse({"error": "Video not found"}, status_code=404)

    out_dir = RUNS / job_id
    out_dir.mkdir(exist_ok=True)

    annotated_path = out_dir / "annotated.mp4"
    tracks_path = out_dir / "tracks.json"

    cap = cv2.VideoCapture(str(video_path))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    cap.release()

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(str(annotated_path), fourcc, float(fps), (w, h))

    frames_out = []

    use_gpu = bool(use_gpu)
    global model_cpu
    if use_gpu:
        model = model_gpu
        device = "cuda:0"
        half = True
    else:
        if model_cpu is None:
            model_cpu = YOLO("yolov8n.pt")
            model_cpu.to("cpu")
        model = model_cpu
        device = "cpu"
        half = False

    results_stream = model.track(
    source=str(video_path),
    stream=True,
    persist=True,
    classes=[0],
    conf=0.3,
    iou=0.5,

    tracker="bytetrack.yaml",
    verbose=False,
    device=device,
    half=half,
    imgsz=640,       # smaller input = faster
    vid_stride=STRIDE,    # process every 2nd frame (~15 fps)
)


    for fi, r in enumerate(results_stream):
        frame = r.orig_img
        dets = []

        if r.boxes is not None and r.boxes.id is not None:
            ids = r.boxes.id.cpu().numpy().astype(int).tolist()
            xyxy = r.boxes.xyxy.cpu().numpy().tolist()
            confs = r.boxes.conf.cpu().numpy().tolist()

            for tid, bb, cf in zip(ids, xyxy, confs):
                x1, y1, x2, y2 = bb

                head_h = 0.35 * (y2 - y1)
                hx1, hy1, hx2, hy2 = x1, y1, x2, y1 + head_h

                hx1 = max(0, min(w - 1, hx1))
                hx2 = max(0, min(w - 1, hx2))
                hy1 = max(0, min(h - 1, hy1))
                hy2 = max(0, min(h - 1, hy2))

                dets.append({
                    "id": int(tid),
                    "bbox": [float(hx1), float(hy1), float(hx2), float(hy2)],
                    "conf": float(cf),
                })

                cv2.rectangle(frame, (int(hx1), int(hy1)), (int(hx2), int(hy2)), (0, 255, 0), 2)
                cv2.putText(
                    frame,
                    f"ID {tid}",
                    (int(hx1), max(20, int(hy1) - 8)),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.7,
                    (0, 255, 0),
                    2,
                    cv2.LINE_AA,
                )

        frames_out.append({"f": fi, "dets": dets})
        writer.write(frame)

    writer.release()

    out_fps = float(fps) / float(STRIDE)
    tracks_payload = {
        "video": {"fps": out_fps, "width": w, "height": h, "frames": len(frames_out)},
        "frames": frames_out,
    }
    tracks_path.write_text(json.dumps(tracks_payload))

    return {"status": "done", "job_id": job_id}
@app.get("/api/annotated/{job_id}")
def get_annotated(job_id: str):
    path = RUNS / job_id / "annotated.mp4"
    if not path.exists():
        return JSONResponse({"error": "Annotated video not found. Run /api/process/{job_id} first."}, status_code=404)
    return FileResponse(str(path), media_type="video/mp4", filename="annotated.mp4")


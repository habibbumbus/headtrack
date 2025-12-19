import { useEffect, useRef, useState } from "react";
import axios from "axios";
import "./app.css";

const API = "http://localhost:8000";

export default function App() {
  const [file, setFile] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState("idle");
  const [processing, setProcessing] = useState(false);
  const [processed, setProcessed] = useState(false);
  const [useGpu, setUseGpu] = useState(true);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [tracks, setTracks] = useState(null);
useEffect(() => {
  if (tracks) startOverlayLoop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [tracks]);

async function loadTracks(id) {
  const res = await axios.get(`${API}/api/tracks/${id}`);
  setTracks(res.data);
}

  async function upload() {
    if (!file) return;
    setStatus("uploading");
    setProcessed(false);
    setJobId(null);

    try {
      const form = new FormData();
      form.append("file", file);

      const res = await axios.post(`${API}/api/upload`, form, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 10 * 60 * 1000,
        onUploadProgress: (e) => {
          if (!e.total) return;
          const pct = Math.round((e.loaded / e.total) * 100);
          setStatus(`uploading (${pct}%)`);
        },
      });

      setJobId(res.data.job_id);
      setStatus("uploaded");
    } catch (err) {
      console.error(err);
      setStatus("upload failed (check console)");
    }
  }

  async function processVideo() {
    if (!jobId) return;
    setProcessing(true);
    setStatus("processing");
    try {
      await axios.post(`${API}/api/process/${jobId}?use_gpu=${useGpu ? 1 : 0}`, null, {
        timeout: 30 * 60 * 1000, // processing can take a while
      });
      setProcessed(true);
      setStatus("processed");
      await loadTracks(jobId);
    } catch (err) {
      console.error(err);
      setStatus("process failed (check backend logs)");
    } finally {
      setProcessing(false);
    }
  }

  const videoUrl = jobId ? `${API}/api/video/${jobId}` : null;
  const annotatedUrl = jobId ? `${API}/api/annotated/${jobId}` : null;

  return (
    <div className="page">
      <div className="card">
        <div className="title">HeadHuntr</div>
        <div className="sub">Upload any MP4 → Track heads in frame</div>

        <div className="row">
          <input
            type="file"
            accept="video/mp4"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <label className="toggle">
            <input
              type="checkbox"
              checked={useGpu}
              onChange={(e) => setUseGpu(e.target.checked)}
            />
            Use GPU
          </label>
          <button onClick={upload} disabled={!file || status.startsWith("uploading")}>
            {status.startsWith("uploading") ? status : "Upload"}
          </button>

          <button onClick={processVideo} disabled={!jobId || processing}>
            {processing ? "Processing..." : "Process"}
          </button>

          <a
            className={`dl ${processed ? "" : "disabled"}`}
            href={processed ? annotatedUrl : undefined}
            download
            onClick={(e) => {
              if (!processed) e.preventDefault();
            }}
          >
            Download annotated
          </a>
        </div>

        {jobId && <div className="meta">job_id: {jobId}</div>}

        {videoUrl && (
  <div style={{ position: "relative", width: "100%" }}>
    <video
      ref={videoRef}
      controls
      className="video"
      src={videoUrl}
      onLoadedMetadata={() => {
        const v = videoRef.current;
        const c = canvasRef.current;
        if (!v || !c) return;

        // match canvas to actual video pixel dimensions
        c.width = v.videoWidth;
        c.height = v.videoHeight;

        // keep canvas visually aligned with the displayed video
        c.style.width = "100%";
        c.style.height = "auto";
      }}
    />

    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "auto",
        pointerEvents: "none",
      }}
    />
  </div>
)}

      </div>
    </div>
  );
  function startOverlayLoop() {
  const v = videoRef.current;
  const c = canvasRef.current;
  if (!v || !c || !tracks) return;

  const ctx = c.getContext("2d");
  const fps = tracks.video?.fps ?? 30;

  function tick() {
    // Clear
    ctx.clearRect(0, 0, c.width, c.height);

    // Draw current frame boxes
    const fi = Math.floor(v.currentTime * fps);
    const frame = tracks.frames?.[fi];

    if (frame?.dets?.length) {
      for (const det of frame.dets) {
        const [x1, y1, x2, y2] = det.bbox;

        ctx.strokeStyle = "lime";
        ctx.lineWidth = 2;
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

        ctx.fillStyle = "lime";
        ctx.font = "16px system-ui";
        ctx.fillText(`ID ${det.id}`, x1 + 4, Math.max(18, y1 - 6));
      }
    }

    requestAnimationFrame(tick);
  }

  tick();
}

}

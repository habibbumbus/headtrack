import { useEffect } from "react";
import { Film, Video, CheckCircle2, Activity } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import { EmptyState } from "./EmptyState";
import { Badge } from "./ui/badge";
import { JobStates } from "../hooks/useJobState";

function VideoCanvasPlayer({ videoUrl, videoRef, canvasRef, onVideoReady }) {
  useEffect(() => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return;

    const syncCanvas = () => {
      if (!v.videoWidth || !v.videoHeight) return;
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      c.style.width = `${v.clientWidth}px`;
      c.style.height = `${v.clientHeight}px`;
      if (onVideoReady) onVideoReady();
    };

    if (v.readyState >= 1) syncCanvas();
    v.addEventListener("loadedmetadata", syncCanvas);
    v.addEventListener("loadeddata", syncCanvas);
    window.addEventListener("resize", syncCanvas);

    return () => {
      v.removeEventListener("loadedmetadata", syncCanvas);
      v.removeEventListener("loadeddata", syncCanvas);
      window.removeEventListener("resize", syncCanvas);
    };
  }, [videoUrl, videoRef, canvasRef, onVideoReady]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-slate-900 shadow-soft">
      <video
        ref={videoRef}
        controls
        className="block h-auto w-full"
        src={videoUrl}
      />
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
    </div>
  );
}

function InfoBar({ frameInfo, jobId }) {
  return (
    <div className="grid gap-3 rounded-2xl border border-border/70 bg-white/70 p-4 text-xs text-muted-foreground shadow-soft sm:grid-cols-4">
      <div>
        <div className="text-[11px] uppercase tracking-[0.2em]">FPS</div>
        <div className="mt-1 text-sm font-semibold text-foreground">{frameInfo?.fps ?? "N/A"}</div>
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-[0.2em]">Frame</div>
        <div className="mt-1 text-sm font-semibold text-foreground">{frameInfo?.frameIndex ?? "N/A"}</div>
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-[0.2em]">Detections</div>
        <div className="mt-1 text-sm font-semibold text-foreground">{frameInfo?.detCount ?? "N/A"}</div>
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-[0.2em]">Job ID</div>
        <div className="mt-1 truncate text-sm font-semibold text-foreground">{jobId || "N/A"}</div>
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <Badge variant="success">Green box</Badge>
      <span>Head region</span>
      <Badge variant="secondary">ID label</Badge>
      <span>Persistent tracker ID</span>
    </div>
  );
}

export function PreviewPanel({ jobState, videoUrl, videoRef, canvasRef, tracks, frameInfo, onVideoReady, jobId }) {
  const isReadyToProcess = jobState === JobStates.UPLOADED || jobState === JobStates.FILE_SELECTED;
  const isProcessing = jobState === JobStates.PROCESSING || jobState === JobStates.UPLOADING;
  const isDone = jobState === JobStates.READY || jobState === JobStates.EXPORTING || jobState === JobStates.COMPLETE;
  const hasTracks = Boolean(tracks?.frames?.length);

  return (
    <Card className="card-glow border-border/70 shadow-soft">
      <CardHeader className="pb-3">
        <CardTitle>Preview</CardTitle>
        <CardDescription>Live overlay synced to the video playback timeline.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!videoUrl && (
          <EmptyState
            icon={Film}
            title="Upload a video to begin"
            description="Select an MP4 file to activate preview and tracking."
          />
        )}

        {videoUrl && isReadyToProcess && (
          <EmptyState
            icon={Video}
            title="Ready to process"
            description="Run tracking to generate head IDs and render overlays."
          />
        )}

        {videoUrl && isProcessing && (
          <EmptyState
            icon={Activity}
            title="Processing in progress"
            description="Tracking is running. The preview will appear when ready."
          />
        )}

        {videoUrl && isDone && hasTracks ? (
          <div className="space-y-4">
            <VideoCanvasPlayer
              videoUrl={videoUrl}
              videoRef={videoRef}
              canvasRef={canvasRef}
              onVideoReady={onVideoReady}
            />
            <Legend />
            <Separator />
            <InfoBar frameInfo={frameInfo} jobId={jobId} />
          </div>
        ) : null}

        {videoUrl && isDone && !hasTracks ? (
          <EmptyState
            icon={CheckCircle2}
            title="Tracks not loaded yet"
            description="Retry processing or refresh tracks to enable overlays."
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

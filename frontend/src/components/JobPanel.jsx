import { Upload, Play, Download, Copy, Loader2, Cpu } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Separator } from "./ui/separator";
import { Switch } from "./ui/switch";
import { StatusBadge } from "./StatusBadge";
import { JobStates } from "../hooks/useJobState";

const MAX_FILE_MB = 500;

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "N/A";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return "N/A";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function UploadCard({
  file,
  fileMeta,
  validationMessage,
  uploadProgress,
  jobState,
  canSelectFile,
  canUpload,
  onFileSelected,
  onUpload,
}) {
  const isUploading = jobState === JobStates.UPLOADING;
  const overMaxSize = file ? file.size > MAX_FILE_MB * 1024 * 1024 : false;
  const isMp4 = file ? file.type === "video/mp4" || file.name.toLowerCase().endsWith(".mp4") : true;
  const validationText =
    validationMessage ||
    (file && !isMp4 ? "Only MP4 files are supported." : null) ||
    (file && overMaxSize ? `Max file size is ${MAX_FILE_MB} MB.` : null);

  return (
    <Card className="card-glow border-border/70 shadow-soft">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Upload MP4</CardTitle>
        <CardDescription>Select a video file to start a new tracking job.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <label
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/70 bg-white/70 p-5 text-center text-sm transition hover:border-primary/60 ${
            canSelectFile ? "" : "pointer-events-none opacity-60"
          }`}
        >
          <Upload className="h-5 w-5 text-primary" />
          <div className="text-sm font-medium text-foreground">Drop MP4 or browse</div>
          <div className="text-xs text-muted-foreground">Up to {MAX_FILE_MB} MB - MP4 only</div>
          <input
            type="file"
            accept="video/mp4"
            className="hidden"
            disabled={!canSelectFile}
            onChange={(event) => {
              const selected = event.target.files?.[0];
              if (selected) onFileSelected(selected);
            }}
          />
        </label>

        <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground sm:grid-cols-3">
          <div>
            <div className="font-semibold text-foreground">File</div>
            <div className="truncate">{file?.name || "N/A"}</div>
          </div>
          <div>
            <div className="font-semibold text-foreground">Size</div>
            <div>{formatBytes(file?.size)}</div>
          </div>
          <div>
            <div className="font-semibold text-foreground">Duration</div>
            <div>{formatDuration(fileMeta?.duration)}</div>
          </div>
        </div>

        {validationText ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {validationText}
          </div>
        ) : null}

        <Button className="w-full" onClick={onUpload} disabled={!canUpload || !!validationText}>
          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {isUploading ? "Uploading..." : "Upload video"}
        </Button>
        {isUploading ? <Progress value={uploadProgress} /> : null}
      </CardContent>
    </Card>
  );
}

function ProcessCard({ canProcess, jobState, processStep, processProgress, onProcess, useGpu, onToggleGpu }) {
  const isProcessing = jobState === JobStates.PROCESSING;
  return (
    <Card className="card-glow border-border/70 shadow-soft">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Process</CardTitle>
        <CardDescription>Generate `tracks.json` with persistent head IDs.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-border/60 bg-white/70 px-4 py-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Mode</div>
            <div className="flex items-center gap-2 text-sm font-medium">
              <Cpu className="h-4 w-4 text-primary" />
              {useGpu ? "GPU acceleration" : "CPU only"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Use GPU</span>
            <Switch checked={useGpu} onCheckedChange={onToggleGpu} />
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Step: <span className="font-semibold text-foreground">{processStep}</span>
        </div>

        <Button className="w-full" onClick={onProcess} disabled={!canProcess}>
          {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {isProcessing ? "Processing..." : "Process tracking"}
        </Button>
        {isProcessing ? <Progress value={processProgress} /> : null}
      </CardContent>
    </Card>
  );
}

function ExportCard({ canExport, jobState, exportStep, exportProgress, onExport, onDownload, canDownload }) {
  const isExporting = jobState === JobStates.EXPORTING;
  return (
    <Card className="card-glow border-border/70 shadow-soft">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Export annotated MP4</CardTitle>
        <CardDescription>Generate a video with head boxes and IDs burned in.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-xs text-muted-foreground">
          Step: <span className="font-semibold text-foreground">{exportStep}</span>
        </div>
        <Button variant="secondary" className="w-full" onClick={onExport} disabled={!canExport}>
          {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {isExporting ? "Exporting..." : "Export annotated MP4"}
        </Button>
        {isExporting ? <Progress value={exportProgress} /> : null}

        {canDownload ? (
          <Button className="w-full" variant="outline" onClick={onDownload}>
            <Download className="h-4 w-4" />
            Download annotated
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function JobMetaCard({ jobId, jobCreatedAt, jobState, tracksCount, onCopyJobId, canCopy, onReset, canReset }) {
  return (
    <Card className="card-glow border-border/70 shadow-soft">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Job details</CardTitle>
        <CardDescription>Track current state and metadata for this job.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em]">Job ID</div>
            <div className="mt-1 truncate text-sm font-medium text-foreground">{jobId || "N/A"}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em]">Created</div>
            <div className="mt-1 text-sm text-foreground">{jobCreatedAt ? jobCreatedAt.toLocaleTimeString() : "N/A"}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em]">Status</div>
            <div className="mt-2">
              <StatusBadge state={jobState} />
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em]">Frames</div>
            <div className="mt-1 text-sm text-foreground">{tracksCount ? `${tracksCount}` : "N/A"}</div>
          </div>
        </div>
        <Separator />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onReset} disabled={!canReset}>
            Reset
          </Button>
          <Button variant="ghost" size="sm" onClick={onCopyJobId} disabled={!canCopy}>
            <Copy className="h-4 w-4" />
            Copy Job ID
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function JobPanel(props) {
  return (
    <div className="space-y-5">
      <UploadCard {...props} />
      <ProcessCard {...props} />
      <ExportCard {...props} />
      <JobMetaCard {...props} />
    </div>
  );
}

// Trims + compresses a video in the browser: plays the chosen window once onto a 720p canvas and records it
// (MediaRecorder) with its audio routed through Web Audio. Works in Safari (MP4) and Chrome (MP4/WebM).

export const MAX_CLIP_SEC = 15;
export const MIN_CLIP_SEC = 3;

export function pickMime() {
  const opts = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  return opts.find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) ?? "";
}

export function canTrim() {
  return typeof window !== "undefined" && typeof MediaRecorder !== "undefined" && !!pickMime() && "captureStream" in HTMLCanvasElement.prototype;
}

function fit(w: number, h: number, long = 1280) {
  const k = Math.min(1, long / Math.max(w, h));
  // even numbers keep H.264 encoders happy
  return { w: Math.round((w * k) / 2) * 2, h: Math.round((h * k) / 2) * 2 };
}

export type TrimResult = { video: File; poster: File | null };

export async function trimClip(src: string, start: number, end: number, onProgress: (p: number) => void): Promise<TrimResult> {
  const v = document.createElement("video");
  v.src = src;
  v.playsInline = true;
  v.preload = "auto";
  v.crossOrigin = "anonymous";
  await new Promise<void>((res, rej) => {
    v.onloadedmetadata = () => res();
    v.onerror = () => rej(new Error("Can't read this video."));
  });
  const { w, h } = fit(v.videoWidth || 1280, v.videoHeight || 720);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  // seek to start, grab the poster frame
  v.currentTime = start;
  await new Promise<void>((res) => (v.onseeked = () => res()));
  ctx.drawImage(v, 0, 0, w, h);
  const poster = await new Promise<File | null>((res) => {
    const pc = document.createElement("canvas");
    const pw = Math.min(640, w);
    pc.width = pw;
    pc.height = Math.round((h * pw) / w);
    pc.getContext("2d")!.drawImage(canvas, 0, 0, pc.width, pc.height);
    pc.toBlob((b) => res(b ? new File([b], "poster.jpg", { type: "image/jpeg" }) : null), "image/jpeg", 0.78);
  });

  // video track from the canvas, audio via Web Audio (Safari has no HTMLMediaElement.captureStream)
  const stream = canvas.captureStream(30);
  let audioCtx: AudioContext | null = null;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AC();
    const srcNode = audioCtx.createMediaElementSource(v);
    const dest = audioCtx.createMediaStreamDestination();
    srcNode.connect(dest);
    dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
  } catch {
    /* silent clip is fine */
  }

  const mime = pickMime();
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 1_600_000, audioBitsPerSecond: 96_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const stopped = new Promise<void>((res) => (rec.onstop = () => res()));

  let raf = 0;
  const draw = () => {
    ctx.drawImage(v, 0, 0, w, h);
    onProgress(Math.min(1, (v.currentTime - start) / (end - start)));
    if (v.currentTime >= end || v.ended) {
      v.pause();
      if (rec.state !== "inactive") rec.stop();
      return;
    }
    raf = requestAnimationFrame(draw);
  };

  rec.start(250);
  await audioCtx?.resume().catch(() => null);
  await v.play();
  raf = requestAnimationFrame(draw);
  await stopped;
  cancelAnimationFrame(raf);
  stream.getTracks().forEach((t) => t.stop());
  audioCtx?.close().catch(() => null);
  onProgress(1);

  const type = mime.split(";")[0] || "video/mp4";
  const blob = new Blob(chunks, { type });
  return { video: new File([blob], `clip.${type.includes("webm") ? "webm" : "mp4"}`, { type }), poster };
}

export async function extractFramesEveryNSeconds(file, intervalSeconds = 1, maxFrames = 30) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);

    video.src = objectUrl;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("Failed to load video for frame extraction."));
    };

    video.onloadedmetadata = async () => {
      try {
        const duration = video.duration;
        if (!duration || !isFinite(duration)) {
          cleanup();
          reject(new Error("Invalid video duration."));
          return;
        }

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          cleanup();
          reject(new Error("Could not initialize canvas for frame extraction."));
          return;
        }

        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;

        const timestamps = buildSamplingPlan(duration, intervalSeconds, maxFrames);
        const frames = [];

        for (const ts of timestamps) {
          await seekVideo(video, ts);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          frames.push({
            timestamp: Number(ts.toFixed(2)),
            imageBase64: canvas.toDataURL("image/jpeg", 0.85),
          });
        }

        cleanup();
        resolve(frames);
      } catch (err) {
        cleanup();
        reject(err);
      }
    };
  });
}

function buildSamplingPlan(duration, intervalSeconds, maxFrames) {
  const timestamps = [];
  const safeInterval = Math.max(0.5, Number(intervalSeconds) || 1);

  let current = 0;
  while (current < duration && timestamps.length < maxFrames) {
    timestamps.push(current);
    current += safeInterval;
  }

  const lastFrameTs = Math.max(0, duration - 0.05);
  if (!timestamps.some((ts) => Math.abs(ts - lastFrameTs) < 0.1)) {
    if (timestamps.length >= maxFrames) {
      timestamps[timestamps.length - 1] = lastFrameTs;
    } else {
      timestamps.push(lastFrameTs);
    }
  }

  return dedupeAndSortTimestamps(timestamps, duration);
}

function dedupeAndSortTimestamps(timestamps, duration) {
  return [...new Set(timestamps.map((ts) => Number(Math.min(Math.max(ts, 0), duration).toFixed(2))))]
    .sort((a, b) => a - b);
}

function seekVideo(video, time) {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
      resolve();
    };

    const onError = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
      reject(new Error("Failed while seeking video."));
    };

    video.addEventListener("seeked", onSeeked, { once: true });
    video.addEventListener("error", onError, { once: true });
    video.currentTime = time;
  });
}

const MAX_VIDEO_FRAMES = 4;
const MAX_FRAME_WIDTH = 960;

function waitForVideoEvent(video: HTMLVideoElement, eventName: string) {
  return new Promise<void>((resolve, reject) => {
    const handleSuccess = () => {
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(new Error("Video görüntüleri hazırlanamadı."));
    };
    const cleanup = () => {
      video.removeEventListener(eventName, handleSuccess);
      video.removeEventListener("error", handleError);
    };

    video.addEventListener(eventName, handleSuccess, { once: true });
    video.addEventListener("error", handleError, { once: true });
  });
}

function getFrameTimestamps(duration: number) {
  const frameCount =
    duration >= 20 ? 4 : duration >= 8 ? 3 : duration > 1 ? 2 : 1;
  const positions =
    frameCount === 4
      ? [0.1, 0.37, 0.63, 0.9]
      : frameCount === 3
        ? [0.2, 0.5, 0.8]
        : frameCount === 2
          ? [0.25, 0.75]
          : [0.5];

  return positions.map((position) =>
    Math.min(Math.max(duration * position, 0.05), Math.max(duration - 0.05, 0)),
  );
}

function canvasToJpeg(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(new Error("Video görüntüsü JPEG biçimine dönüştürülemedi."));
      },
      "image/jpeg",
      0.8,
    );
  });
}

export async function extractVideoFrames(file: File): Promise<File[]> {
  if (
    typeof document === "undefined" ||
    (!file.type.startsWith("video/") && !/\.(mp4|webm)$/i.test(file.name))
  ) {
    return [];
  }

  const video = document.createElement("video");
  const objectUrl = URL.createObjectURL(file);

  video.muted = true;
  video.playsInline = true;
  video.preload = "metadata";

  try {
    const metadataReady = waitForVideoEvent(video, "loadedmetadata");
    video.src = objectUrl;
    video.load();
    await metadataReady;

    if (
      !Number.isFinite(video.duration) ||
      video.duration <= 0 ||
      video.videoWidth <= 0 ||
      video.videoHeight <= 0
    ) {
      throw new Error("Video bilgileri okunamadı.");
    }

    const scale = Math.min(1, MAX_FRAME_WIDTH / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Video görüntüsü hazırlanamadı.");
    }

    const baseName = file.name.replace(/\.[^.]+$/, "") || "video";
    const frames: File[] = [];

    for (const [index, timestamp] of getFrameTimestamps(video.duration)
      .slice(0, MAX_VIDEO_FRAMES)
      .entries()) {
      const seeked = waitForVideoEvent(video, "seeked");
      video.currentTime = timestamp;
      await seeked;

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frameBlob = await canvasToJpeg(canvas);

      frames.push(
        new File([frameBlob], `${baseName}-gorsel-kare-${index + 1}.jpg`, {
          type: "image/jpeg",
          lastModified: file.lastModified,
        }),
      );
    }

    return frames;
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(objectUrl);
  }
}

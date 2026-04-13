import { useEffect, useRef } from "react";
import { api } from "../services/api";

export function CameraProcessor({ cam }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const processingRef = useRef(false);

  useEffect(() => {
    let stream = null;
    let processingTimer = null;
    let stopped = false;

    async function connect() {
      if (cam.source === "device") {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter((d) => d.kind === "videoinput");
          const deviceId = videoDevices[cam.deviceIndex]?.deviceId;

          stream = await navigator.mediaDevices.getUserMedia({
            video: deviceId ? { deviceId: { exact: deviceId } } : true,
            audio: false,
          });

          if (stopped) return;

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play().catch(() => {});
          }

          startFrameProcessing();
        } catch (err) {
          console.error(`CameraProcessor ${cam.id} failed to connect:`, err);
        }
      } else if (cam.source === "stream" || cam.source === "rtsp") {
        if (!cam.streamUrl) return;

        if (videoRef.current) {
          videoRef.current.src = cam.streamUrl;
          videoRef.current
            .play()
            .then(() => {
              if (!stopped) startFrameProcessing();
            })
            .catch((err) => {
              console.error(`CameraProcessor ${cam.id} stream failed:`, err);
            });
        }
      }
    }

    function startFrameProcessing() {
      const intervalMs = cam.processingIntervalMs || 2000;

      processingTimer = setInterval(async () => {
        if (!videoRef.current || !canvasRef.current) return;
        if (processingRef.current) return;
        if (videoRef.current.readyState < 2) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        if (!ctx || !video.videoWidth || !video.videoHeight) return;

        try {
          processingRef.current = true;

          const targetWidth = 640;
          const scale = targetWidth / video.videoWidth;
          const targetHeight = Math.max(1, Math.round(video.videoHeight * scale));

          canvas.width = targetWidth;
          canvas.height = targetHeight;

          ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

          const imageBase64 = canvas.toDataURL("image/jpeg", 0.7);

          await api.processCctvFrame({
            image_base64: imageBase64,
            camera_id: cam.id,
            location: cam.location,
            confidence_threshold: 0.5,
            include_debug: false,
          });
        } catch (err) {
          console.error(`CameraProcessor ${cam.id} processing failed:`, err);
        } finally {
          processingRef.current = false;
        }
      }, intervalMs);
    }

    connect();

    return () => {
      stopped = true;

      if (processingTimer) clearInterval(processingTimer);

      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = "";
      }
    };
  }, [cam]);

  return (
    <>
      <video ref={videoRef} muted playsInline autoPlay style={{ display: "none" }} />
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </>
  );
}
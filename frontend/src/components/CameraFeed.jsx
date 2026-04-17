import { useEffect, useRef, useState } from "react";
import { C, card } from "../constants/colors";
import { Spinner } from "./ui";
import { api } from "../services/api";

export function CameraFeed({ cam }) {
  const videoRef = useRef(null);
  const imageRef = useRef(null);
  const canvasRef = useRef(null);
  const processingRef = useRef(false);

  const [camStatus, setCamStatus] = useState("connecting");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let stream = null;
    let timer = null;
    let stopped = false;

    async function connect() {
      setCamStatus("connecting");
      setErrorMsg("");

      try {
        if (cam.source === "device") {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter((d) => d.kind === "videoinput");
          const selectedDevice = videoDevices[cam.deviceIndex];

          if (!selectedDevice) {
            throw new Error(
              `No video device found for ${cam.id} at index ${cam.deviceIndex}. Found only ${videoDevices.length} video device(s).`
            );
          }

          stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: selectedDevice.deviceId } },
            audio: false,
          });

          if (stopped) return;

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play().catch(() => {});
          }

          setCamStatus("live");
          startProcessing("video");
        } else if (cam.source === "stream") {
          if (!cam.streamUrl || !imageRef.current) {
            setCamStatus("no-url");
            return;
          }

          imageRef.current.crossOrigin = "anonymous";

          imageRef.current.onload = () => {
            if (stopped) return;
            setCamStatus("live");
            startProcessing("image");
          };

          imageRef.current.onerror = () => {
            setCamStatus("error");
            setErrorMsg("Stream unavailable");
          };

          imageRef.current.src = cam.streamUrl;
        } else if (cam.source === "placeholder") {
        if (!cam.videoUrl) {
          setCamStatus("no-url");
          return;
        }
          setCamStatus("live");
        } else if (cam.source === "rtsp") {
          setCamStatus("error");
          setErrorMsg("RTSP is not directly supported in browser");
        }
      } catch (err) {
        setCamStatus("error");
        setErrorMsg(
          err?.name === "NotAllowedError"
            ? "Camera permission denied"
            : err?.name === "NotFoundError"
            ? "Camera not found"
            : `Error: ${err.message || "Connection failed"}`
        );
      }
    }

    function startProcessing(sourceType) {
      const intervalMs = cam.processingIntervalMs || 1000;

      if (timer) clearInterval(timer);

      timer = setInterval(async () => {
        if (processingRef.current || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let sourceEl = null;
        let width = 0;
        let height = 0;

        if (sourceType === "video") {
          const video = videoRef.current;
          if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return;
          sourceEl = video;
          width = video.videoWidth;
          height = video.videoHeight;
        } else {
          const img = imageRef.current;
          if (!img || !img.naturalWidth || !img.naturalHeight) return;
          sourceEl = img;
          width = img.naturalWidth;
          height = img.naturalHeight;
        }

        try {
          processingRef.current = true;

          const targetWidth = 640;
          const scale = targetWidth / width;
          const targetHeight = Math.max(1, Math.round(height * scale));

          canvas.width = targetWidth;
          canvas.height = targetHeight;

          ctx.drawImage(sourceEl, 0, 0, targetWidth, targetHeight);

          let imageBase64;
          try {
            imageBase64 = canvas.toDataURL("image/jpeg", 0.7);
          } catch (err) {
            console.error(`Camera ${cam.id} canvas export failed:`, err);
            return;
          }

          await api.processCctvFrame({
            image_base64: imageBase64,
            camera_id: cam.id,
            location: cam.location,
            confidence_threshold: 0.5,
            include_debug: false,
          });
        } catch (err) {
          console.error(`Camera ${cam.id} processing failed:`, err);
        } finally {
          processingRef.current = false;
        }
      }, intervalMs);
    }

    connect();

    return () => {
      stopped = true;

      if (timer) clearInterval(timer);

      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = "";
      }

      if (imageRef.current) {
        imageRef.current.onload = null;
        imageRef.current.onerror = null;
        imageRef.current.src = "";
      }
    };
  }, [cam]);

  const statusColor =
    camStatus === "live" ? C.green : camStatus === "connecting" ? C.amber : C.red;

  const statusLabel =
    camStatus === "live"
      ? "Live"
      : camStatus === "connecting"
      ? "Connecting…"
      : camStatus === "no-url"
      ? "Not configured"
      : "Error";

  return (
    <div
      style={card({
        padding: 0,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      })}
    >
      <div
        style={{
          position: "relative",
          background: "#0a0b0d",
          aspectRatio: "16/9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {cam.source === "device" ? (
          <video
            ref={videoRef}
            muted
            playsInline
            autoPlay
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: camStatus === "live" ? "block" : "none",
            }}
          />
        ) : cam.source === "stream" && cam.streamUrl && camStatus === "live" ? (
          <img
            ref={imageRef}
            src={cam.streamUrl}
            alt={cam.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : cam.source === "placeholder" && cam.videoUrl ? (
          <video
            src={cam.videoUrl}
            autoPlay
            muted
            loop
            playsInline
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) :
        (
          <img ref={imageRef} alt="" style={{ display: "none" }} />
        )}

        {camStatus !== "live" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              padding: 20,
              textAlign: "center",
            }}
          >
            {camStatus === "connecting" ? (
              <>
                <Spinner size={28} />
                <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>
                  Connecting to camera…
                </p>
              </>
            ) : (
              <p style={{ fontSize: 11, color: camStatus === "no-url" ? C.textMuted : C.red, margin: 0 }}>
                {camStatus === "no-url" ? "No stream URL configured." : errorMsg || "Connection failed"}
              </p>
            )}
          </div>
        )}

        {camStatus === "live" && (
          <div
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              background: "rgba(0,0,0,0.6)",
              borderRadius: 20,
              padding: "3px 10px",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: C.red,
                display: "inline-block",
              }}
            />
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#fff",
                letterSpacing: ".5px",
              }}
            >
              LIVE
            </span>
          </div>
        )}

        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            background: "rgba(0,0,0,0.55)",
            borderRadius: 6,
            padding: "3px 8px",
          }}
        >
          <span style={{ fontSize: 10, color: C.textSecondary, fontWeight: 600 }}>
            {cam.id}
          </span>
        </div>
      </div>

      <div
        style={{
          padding: "10px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
            {cam.name}
          </p>

          <span
            style={{
              background:
                camStatus === "live"
                  ? C.greenDim
                  : camStatus === "connecting"
                  ? C.amberDim
                  : C.redDim,
              color: statusColor,
              fontSize: 11,
              fontWeight: 700,
              padding: "3px 10px",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: statusColor,
                display: "inline-block",
              }}
            />
            {statusLabel}
          </span>
        </div>
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}
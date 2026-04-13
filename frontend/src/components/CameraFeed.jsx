import { useState, useRef, useEffect } from "react";
import { C, card } from "../constants/colors";
import { Spinner } from "./ui";
import { api } from "../services/api";

export function CameraFeed({ cam }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const processingRef = useRef(false);

  const [camStatus, setCamStatus] = useState("connecting");
  const [errorMsg, setErrorMsg] = useState("");
  const [lastProcessedAt, setLastProcessedAt] = useState(null);
  const [lastProcessingMsg, setLastProcessingMsg] = useState("Waiting...");
  const [incidentsCreated, setIncidentsCreated] = useState(0);

  useEffect(() => {
    let stream = null;
    let processingTimer = null;

    async function connect() {
      setCamStatus("connecting");
      setErrorMsg("");

      if (cam.source === "device") {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter((d) => d.kind === "videoinput");
          const deviceId = videoDevices[cam.deviceIndex]?.deviceId;

          stream = await navigator.mediaDevices.getUserMedia({
            video: deviceId ? { deviceId: { exact: deviceId } } : true,
            audio: false,
          });

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            console.log(cam.id, {
              labelHint: cam.deviceLabelHint,
              videoWidth: videoRef.current?.videoWidth,
              videoHeight: videoRef.current?.videoHeight,
              readyState: videoRef.current?.readyState,
            });
            await videoRef.current.play().catch(() => {});
          }

          setCamStatus("live");
          startFrameProcessing();
        } catch (err) {
          setCamStatus("error");
          setErrorMsg(
            err.name === "NotAllowedError"
              ? "Camera permission denied"
              : err.name === "NotFoundError"
              ? "Camera not found"
              : `Error: ${err.message}`
          );
        }
      } else if (cam.source === "stream" || cam.source === "rtsp") {
        if (!cam.streamUrl) {
          setCamStatus("no-url");
          return;
        }

        if (videoRef.current) {
          videoRef.current.src = cam.streamUrl;
          videoRef.current
            .play()
            .then(() => {
              setCamStatus("live");
              startFrameProcessing();
            })
            .catch(() => {
              setCamStatus("error");
              setErrorMsg("Stream unavailable");
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

          const response = await api.processCctvFrame({
            image_base64: imageBase64,
            camera_id: cam.id,
            location: cam.location,
            confidence_threshold: 0.5,
            include_debug: true,
          });

          setLastProcessedAt(new Date());
          setIncidentsCreated(response.incidents_created || 0);

          const directCount = response.debug?.direct_detection_count ?? 0;
          setLastProcessingMsg(
            response.incidents_created > 0
              ? `${response.incidents_created} incident(s) created`
              : `${directCount} detection(s), no incidents`
          );
        } catch (err) {
          setLastProcessingMsg(`Processing failed: ${err.message}`);
        } finally {
          processingRef.current = false;
        }
      }, intervalMs);
    }

    connect();

    return () => {
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

        <canvas ref={canvasRef} style={{ display: "none" }} />

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
            ) : camStatus === "no-url" ? (
              <p style={{ fontSize: 11, color: C.textMuted, margin: 0 }}>
                No stream URL configured.
              </p>
            ) : (
              <p style={{ fontSize: 11, color: C.red, margin: 0 }}>
                {errorMsg || "Connection failed"}
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
                animation: "pulse 1.5s ease-in-out infinite",
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
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
              {cam.name}
            </p>
            <p style={{ fontSize: 11, color: C.textMuted, margin: "2px 0 0" }}>
              {cam.location}
            </p>
          </div>

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

        <div style={{ fontSize: 11, color: C.textSecondary }}>
          Backend: {lastProcessingMsg}
        </div>

        <div style={{ fontSize: 11, color: C.textMuted }}>
          Last processed:{" "}
          {lastProcessedAt ? lastProcessedAt.toLocaleTimeString() : "Not yet"}
        </div>

        {incidentsCreated > 0 && (
          <div style={{ fontSize: 11, color: C.red, fontWeight: 700 }}>
            Incidents created: {incidentsCreated}
          </div>
        )}
      </div>
    </div>
  );
}

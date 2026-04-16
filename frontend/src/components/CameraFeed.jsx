import { useState, useRef, useEffect } from "react";
import { C, card } from "../constants/colors";
import { Spinner } from "./ui";

export function CameraFeed({ cam }) {
  const videoRef = useRef(null);

  const [camStatus, setCamStatus] = useState("connecting");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let stream = null;
    let stopped = false;

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

          if (stopped) return;

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play().catch(() => {});
          }

          setCamStatus("live");
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
              if (!stopped) setCamStatus("live");
            })
            .catch(() => {
              setCamStatus("error");
              setErrorMsg("Stream unavailable");
            });
        }
      }
    }

    connect();

    return () => {
      stopped = true;

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
      </div>
    </div>
  );
}
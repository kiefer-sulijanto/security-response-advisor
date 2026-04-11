import { useState } from "react";
import { C, card, font } from "../constants/colors";
import { CAMERA_CONFIG } from "../config/cameras";
import { TopBar } from "../components/TopBar";
import { CameraFeed } from "../components/CameraFeed";

export function CamerasPage({ criticalCount }) {
  const [permissionAsked, setPermissionAsked] = useState(false);

  const requestPermission = async () => {
    setPermissionAsked(true);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      s.getTracks().forEach(t => t.stop()); // just to trigger permission prompt
    } catch (_) {}
  };

  return (
    <div style={{ flex: 1, overflow: "auto", background: C.bg, fontFamily: font }}>
      <TopBar title="Live Cameras" subtitle="9-camera security feed" criticalCount={criticalCount} />
      <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Permission helper */}
        {!permissionAsked && (
          <div style={card({ padding: "14px 20px", display: "flex", alignItems: "center",
            justifyContent: "space-between", borderColor: C.amber, background: C.amberDim })}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: "0 0 2px" }}>
                Camera permission required
              </p>
              <p style={{ fontSize: 12, color: C.textSecondary, margin: 0 }}>
                Device cameras need browser permission to display. Click to allow.
              </p>
            </div>
            <button onClick={requestPermission} style={{
              background: C.amber, color: "#1a1a1a", border: "none", borderRadius: 50,
              padding: "9px 20px", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0,
            }}>Allow cameras</button>
          </div>
        )}

        {/* 3×3 grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          {CAMERA_CONFIG.map(cam => <CameraFeed key={cam.id} cam={cam} />)}
        </div>

      </div>
    </div>
  );
}

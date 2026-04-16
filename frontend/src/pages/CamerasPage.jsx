import { C, font } from "../constants/colors";
import { CAMERA_CONFIG } from "../config/cameras";
import { TopBar } from "../components/TopBar";
import { CameraFeed } from "../components/CameraFeed";

export function CamerasPage({ criticalCount }) {
  return (
    <div style={{ flex: 1, overflow: "auto", background: C.bg, fontFamily: font, overscrollBehavior: "contain" }}>
      <TopBar title="Live Cameras" subtitle="6-camera security feed" criticalCount={criticalCount} />
      <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* 3×2 grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          {CAMERA_CONFIG.map(cam => <CameraFeed key={cam.id} cam={cam} />)}
        </div>

      </div>
    </div>
  );
}

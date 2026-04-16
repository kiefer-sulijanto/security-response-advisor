import { C, font } from "../constants/colors";
import certisLogo from "../images/new-logo-certis-x2.png";

const ICONS = {
  dashboard: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  ),
  upload: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="3" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M11 6.5l4-2.5v8l-4-2.5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  ),
  cameras: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M5.5 3h5l1.5 2H14a1 1 0 011 1v6a1 1 0 01-1 1H2a1 1 0 01-1-1V6a1 1 0 011-1h2L5.5 3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <circle cx="8" cy="8.5" r="2" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  ),
  incidents: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 2L14.5 13H1.5L8 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <line x1="8" y1="7" x2="8" y2="10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <circle cx="8" cy="11.5" r=".7" fill="currentColor"/>
    </svg>
  ),
  officers: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M1 13c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <circle cx="12" cy="5" r="2" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M12 10c1.66 0 3 1.34 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  report: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="1" width="10" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <line x1="5" y1="5" x2="9" y2="5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="5" y1="8" x2="9" y2="8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="5" y1="11" x2="7.5" y2="11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M11 10l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <circle cx="12" cy="11" r="2" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  ),
  shift: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 2h1v2a1 1 0 001 1h6a1 1 0 001-1V2h1a1 1 0 011 1v11a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M6 2h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="4.5" y1="8" x2="11.5" y2="8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="4.5" y1="11" x2="9" y2="11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
};

const NAV_MAIN = [
  { id: "dashboard", label: "Dashboard" },
  { id: "upload",    label: "Analyze" },
  { id: "cameras",   label: "Cameras" },
  { id: "incidents", label: "Incidents" },
  { id: "officers",  label: "Ground Officers" },
  { id: "report",    label: "Report" },
];

export function Sidebar({ active, onNav, incidentCount }) {
  return (
    <div style={{
      width: 220, flexShrink: 0,
      background: C.sidebar, borderRight: `1px solid ${C.border}`,
      display: "flex", flexDirection: "column", fontFamily: font,
      height: "100vh", overflowY: "auto", overscrollBehavior: "contain",
    }}>
      {/* Logo */}
      <div style={{ padding: "24px 20px 20px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src={certisLogo} alt="Certis" style={{ width: 52, height: 52, objectFit: "contain" }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 800, color: C.textPrimary, margin: 0, lineHeight: 1.2 }}>SecureAdvisor</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: "16px 10px", flex: 1, display: "flex", flexDirection: "column" }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, letterSpacing: "1px",
          textTransform: "uppercase", margin: "0 0 8px 10px" }}>Navigation</p>

        {NAV_MAIN.map(item => {
          const isActive = active === item.id;
          return (
            <button key={item.id} onClick={() => onNav(item.id)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", borderRadius: 8, border: "none",
              background: isActive ? C.greenDim : "transparent",
              color: isActive ? C.green : C.textSecondary,
              fontSize: 14, fontWeight: isActive ? 700 : 500,
              cursor: "pointer", marginBottom: 2,
              transition: "background .15s, color .15s", textAlign: "left",
            }}
            onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = C.surface; e.currentTarget.style.color = C.textPrimary; }}}
            onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.textSecondary; }}}
            >
              <span style={{ width: 20, display: "flex", alignItems: "center", justifyContent: "center",
                opacity: isActive ? 1 : 0.6, color: isActive ? C.green : C.textSecondary }}>
                {ICONS[item.id]}
              </span>
              {item.label}
              {item.id === "incidents" && incidentCount > 0 && (
                <span style={{ marginLeft: "auto", background: C.red, color: "#fff",
                  fontSize: 10, fontWeight: 800, width: 18, height: 18, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center" }}>{incidentCount}</span>
              )}
            </button>
          );
        })}

        {/* End of Shift — pinned at bottom */}
        <div style={{ marginTop: "auto", paddingTop: 12 }}>
          <button
            onClick={() => onNav("shift")}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "11px 14px", borderRadius: 10, border: "none",
              background: active === "shift" ? "rgba(240,120,32,0.18)" : "rgba(240,120,32,0.08)",
              color: C.green,
              fontSize: 14, fontWeight: 700,
              cursor: "pointer",
              transition: "background .15s", textAlign: "left",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(240,120,32,0.2)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = active === "shift" ? "rgba(240,120,32,0.18)" : "rgba(240,120,32,0.08)"; }}
          >
            <span style={{ width: 20, display: "flex", alignItems: "center", justifyContent: "center", color: C.green }}>
              {ICONS.shift}
            </span>
            End of Shift
          </button>
        </div>
      </nav>
    </div>
  );
}

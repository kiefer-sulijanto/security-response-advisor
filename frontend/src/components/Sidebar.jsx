import { C, font } from "../constants/colors";
import { NAV } from "../config/cameras";
import certisLogo from "../images/new-logo-certis-x2.png";

export function Sidebar({ active, onNav, incidentCount }) {
  return (
    <div style={{
      width: 220, flexShrink: 0,
      background: C.sidebar, borderRight: `1px solid ${C.border}`,
      display: "flex", flexDirection: "column", fontFamily: font, minHeight: "100vh",
    }}>
      {/* Logo */}
      <div style={{ padding: "24px 20px 20px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src={certisLogo} alt="Certis" style={{ width: 32, height: 32, objectFit: "contain" }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 800, color: C.textPrimary, margin: 0, lineHeight: 1.2 }}>SecureAdvisor</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: "12px 10px", flex: 1 }}>
        {NAV.map(item => {
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
              <span style={{ fontSize: 14, width: 20, textAlign: "center", opacity: isActive ? 1 : .6 }}>{item.icon}</span>
              {item.label}
              {item.id === "incidents" && incidentCount > 0 && (
                <span style={{ marginLeft: "auto", background: C.red, color: "#fff",
                  fontSize: 10, fontWeight: 800, width: 18, height: 18, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center" }}>{incidentCount}</span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default function Pricing() {
  return (
    <div style={{
      width: 390, height: 844, overflow: "hidden", position: "relative",
      background: "#07071a", fontFamily: "'Inter', system-ui, sans-serif", color: "#f0f0ff",
      display: "flex", flexDirection: "column",
    }}>
      {/* Status bar */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 24px 0", fontSize: 13, fontWeight: 600 }}>
        <span>9:41</span>
        <div style={{ display: "flex", gap: 6 }}><span>●●●●</span><span>WiFi</span><span>⬛</span></div>
      </div>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px 0" }}>
        <span style={{ fontSize: 20, color: "rgba(240,240,255,0.4)" }}>←</span>
        <div />
      </div>

      <div style={{ flex: 1, padding: "8px 20px 20px", overflow: "hidden", display: "flex", flexDirection: "column" }}>

        {/* Hero */}
        <div style={{ textAlign: "center", paddingBottom: 20 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.3)",
            borderRadius: 100, padding: "4px 14px", marginBottom: 14,
          }}>
            <span style={{ fontSize: 14 }}>✦</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#ffd700", letterSpacing: "0.05em" }}>ZENITH PRO</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.03em", margin: "0 0 6px" }}>
            Unlimited Access
          </h1>
          <p style={{ fontSize: 14, color: "rgba(240,240,255,0.5)", margin: 0 }}>
            All AI Models, every prompt, no limits
          </p>
        </div>

        {/* Price */}
        <div style={{
          background: "rgba(255,215,0,0.06)", border: "1px solid rgba(255,215,0,0.25)",
          borderRadius: 20, padding: "20px", marginBottom: 14, textAlign: "center",
          boxShadow: "0 0 30px rgba(255,215,0,0.1)",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", gap: 4 }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: "rgba(240,240,255,0.6)", paddingTop: 8 }}>$</span>
            <span style={{ fontSize: 48, fontWeight: 900, lineHeight: 1, letterSpacing: "-0.04em", color: "#ffd700" }}>9</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: "rgba(240,240,255,0.6)", paddingTop: 8 }}>.99</span>
          </div>
          <div style={{ fontSize: 13, color: "rgba(240,240,255,0.4)", marginTop: 4 }}>per month · cancel anytime</div>
        </div>

        {/* Features */}
        <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { icon: "∞", label: "Unlimited prompts to All AI Models" },
            { icon: "✦", label: "Synthesis across every response" },
            { icon: "💬", label: "Unlimited conversation threads" },
            { icon: "⚡", label: "Priority response speed" },
            { icon: "🔒", label: "Private, encrypted, never shared" },
          ].map(({ icon, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 15,
              }}>{icon}</div>
              <span style={{ fontSize: 14, color: "rgba(240,240,255,0.8)" }}>{label}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
          <button style={{
            width: "100%", padding: "16px",
            background: "linear-gradient(135deg, #ffd700, #f59e0b)",
            border: "none", borderRadius: 14,
            fontSize: 16, fontWeight: 800, color: "#000", cursor: "pointer",
            boxShadow: "0 4px 20px rgba(255,215,0,0.3)",
          }}>
            Start Pro — $9.99/month
          </button>
          <div style={{ textAlign: "center", fontSize: 12, color: "rgba(240,240,255,0.3)" }}>
            Free plan: 10 prompts to try the full experience
          </div>
        </div>
      </div>
    </div>
  );
}

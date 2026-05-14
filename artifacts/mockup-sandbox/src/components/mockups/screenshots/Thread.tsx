export default function Thread() {
  const color = "#00e5b0";
  const glow = "#00e5b040";

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
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 16px",
        borderBottom: `1px solid ${color}30`,
        background: `${color}08`,
      }}>
        <span style={{ fontSize: 20, color: "rgba(240,240,255,0.5)" }}>←</span>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `${color}18`, border: `1px solid ${color}55`,
          boxShadow: `0 0 12px ${glow}`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: 16, fontWeight: 800, color }}>C</span>
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: color }}>ChatGPT</div>
          <div style={{ fontSize: 12, color: "rgba(240,240,255,0.4)" }}>GPT-5.4</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, padding: "16px", overflow: "hidden", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* User message */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div style={{
            maxWidth: "78%",
            background: "linear-gradient(135deg, #22c55e22, #16a34a22)",
            border: "1px solid rgba(34,197,94,0.25)",
            borderRadius: "16px 16px 4px 16px",
            padding: "10px 14px",
          }}>
            <p style={{ fontSize: 14, lineHeight: 1.5, margin: 0, color: "rgba(240,240,255,0.9)" }}>
              What's the best way to structure a Node.js API for scale?
            </p>
          </div>
        </div>

        {/* AI response */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
            background: `${color}18`, border: `1px solid ${color}55`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 13, fontWeight: 800, color }}>C</span>
          </div>
          <div style={{
            background: "rgba(255,255,255,0.04)", border: `1px solid ${color}30`,
            borderRadius: "4px 16px 16px 16px", padding: "12px 14px",
            boxShadow: `0 0 16px ${glow}`,
          }}>
            <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, color: "rgba(240,240,255,0.88)" }}>
              For a scalable Node.js API, I'd recommend a layered architecture:
            </p>
            <p style={{ fontSize: 14, lineHeight: 1.6, margin: "10px 0 0", color: "rgba(240,240,255,0.75)" }}>
              <strong style={{ color }}>1. Route → Controller → Service → Repository</strong> pattern keeps concerns separated and testable.
            </p>
            <p style={{ fontSize: 14, lineHeight: 1.6, margin: "8px 0 0", color: "rgba(240,240,255,0.75)" }}>
              <strong style={{ color }}>2. Dependency injection</strong> via a container (like Tsyringe or Awilix) makes swapping implementations trivial as you scale.
            </p>
            <p style={{ fontSize: 14, lineHeight: 1.6, margin: "8px 0 0", color: "rgba(240,240,255,0.75)" }}>
              <strong style={{ color }}>3. Event-driven patterns</strong> for non-critical paths — don't block your request cycle on things like email or analytics.
            </p>
          </div>
        </div>

        {/* Follow-up user message */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div style={{
            maxWidth: "78%",
            background: "linear-gradient(135deg, #22c55e22, #16a34a22)",
            border: "1px solid rgba(34,197,94,0.25)",
            borderRadius: "16px 16px 4px 16px",
            padding: "10px 14px",
          }}>
            <p style={{ fontSize: 14, lineHeight: 1.5, margin: 0, color: "rgba(240,240,255,0.9)" }}>
              How do you handle database connection pooling at scale?
            </p>
          </div>
        </div>

        {/* Streaming response */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: `${color}18`, border: `1px solid ${color}55`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 800, color }}>C</span>
          </div>
          <div style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${color}30`, borderRadius: "4px 16px 16px 16px", padding: "12px 14px", boxShadow: `0 0 16px ${glow}` }}>
            <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, color: "rgba(240,240,255,0.88)" }}>
              Connection pooling is critical at scale. Use <strong style={{ color }}>pg-pool</strong> for PostgreSQL with a pool size of ~10–20 connections per instance…
              <span style={{ display: "inline-block", width: 8, height: 14, background: color, marginLeft: 2, borderRadius: 1, verticalAlign: "middle", opacity: 0.8 }} />
            </p>
          </div>
        </div>
      </div>

      {/* Input bar */}
      <div style={{ padding: "6px 16px 20px" }}>
        <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 20, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ flex: 1, fontSize: 14, color: "rgba(240,240,255,0.35)" }}>Reply to ChatGPT…</span>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: "linear-gradient(135deg, #22c55e, #16a34a)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#000", fontSize: 14, fontWeight: 700 }}>↑</span>
          </div>
        </div>
      </div>
    </div>
  );
}

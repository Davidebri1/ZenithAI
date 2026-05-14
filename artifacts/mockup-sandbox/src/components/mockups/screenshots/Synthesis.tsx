const PROVIDERS = [
  { name: "ChatGPT", color: "#00e5b0", glow: "#00e5b040" },
  { name: "Claude", color: "#ff6b47", glow: "#ff6b4740" },
  { name: "Gemini", color: "#7c5fff", glow: "#7c5fff40" },
  { name: "Grok", color: "#00d4ff", glow: "#00d4ff40" },
  { name: "DeepSeek", color: "#4d6bfe", glow: "#4d6bfe40" },
  { name: "Mistral", color: "#ffc400", glow: "#ffc40040" },
  { name: "Llama", color: "#e040fb", glow: "#e040fb40" },
  { name: "Qwen", color: "#69ff47", glow: "#69ff4740" },
];

export default function Synthesis() {
  return (
    <div style={{
      width: 390, height: 844, overflow: "hidden", position: "relative",
      background: "#07071a", fontFamily: "'Inter', system-ui, sans-serif", color: "#f0f0ff",
      display: "flex", flexDirection: "column",
    }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(7,7,26,0.6) 0%, rgba(7,7,26,0.92) 100%)", zIndex: 0 }} />

      {/* Status bar */}
      <div style={{ position: "relative", zIndex: 10, display: "flex", justifyContent: "space-between", padding: "14px 24px 0", fontSize: 13, fontWeight: 600 }}>
        <span>9:41</span>
        <div style={{ display: "flex", gap: 6 }}><span>●●●●</span><span>WiFi</span><span>⬛</span></div>
      </div>

      {/* Logo */}
      <div style={{ position: "relative", zIndex: 10, display: "flex", justifyContent: "center", paddingTop: 10, paddingBottom: 8 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #1a1a3e, #0d0d26)", border: "1px solid rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontWeight: 900, fontSize: 18, color: "#fff" }}>Z</span>
        </div>
      </div>

      {/* Synthesis card — expanded */}
      <div style={{
        position: "relative", zIndex: 10, margin: "0 12px 10px",
        background: "rgba(255,215,0,0.06)",
        border: "1px solid rgba(255,215,0,0.45)",
        borderRadius: 16, overflow: "hidden",
        boxShadow: "0 0 24px rgba(255,215,0,0.2)",
      }}>
        <div style={{
          background: "rgba(255,215,0,0.12)", borderBottom: "1px solid rgba(255,215,0,0.25)",
          padding: "10px 14px", display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ fontSize: 16 }}>✦</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: "#ffd700", letterSpacing: "0.02em" }}>SYNTHESIS</span>
          <span style={{ fontSize: 11, color: "rgba(255,215,0,0.55)", marginLeft: "auto" }}>All 8 Models</span>
        </div>
        <div style={{ padding: "12px 14px" }}>
          <p style={{ fontSize: 13, lineHeight: 1.65, color: "rgba(240,240,255,0.88)", margin: 0 }}>
            All eight models converge on a three-phase approach: <strong style={{ color: "#ffd700" }}>define clear success metrics first</strong>, then identify constraints, and iterate rapidly with feedback loops.
          </p>
          <p style={{ fontSize: 13, lineHeight: 1.65, color: "rgba(240,240,255,0.75)", margin: "10px 0 0" }}>
            ChatGPT and DeepSeek emphasize technical rigor, while Claude and Mistral favor structured frameworks. Gemini, Llama, and Qwen highlight the value of hybrid approaches. Grok alone recommends starting with the simplest viable path.
          </p>
          <p style={{ fontSize: 12, lineHeight: 1.6, color: "rgba(240,240,255,0.5)", margin: "10px 0 0", fontStyle: "italic" }}>
            Consensus confidence: High · 7 of 8 models aligned on core principles
          </p>
        </div>
      </div>

      {/* Collapsed cards below */}
      <div style={{
        position: "relative", zIndex: 10, flex: 1,
        padding: "0 10px", overflow: "hidden",
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignContent: "start",
      }}>
        {PROVIDERS.map((p) => (
          <div key={p.name} style={{
            background: "rgba(255,255,255,0.03)", border: `1px solid ${p.color}40`,
            borderRadius: 12, padding: "8px 10px",
            boxShadow: `0 0 8px ${p.glow}`,
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: p.color }}>{p.name}</span>
            <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, marginTop: 6 }} />
            <div style={{ height: 6, background: "rgba(255,255,255,0.04)", borderRadius: 3, marginTop: 4, width: "70%" }} />
          </div>
        ))}
      </div>

      {/* Input bar */}
      <div style={{ position: "relative", zIndex: 10, padding: "6px 16px 12px" }}>
        <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 20, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ flex: 1, fontSize: 14, color: "rgba(240,240,255,0.35)" }}>Ask a follow-up…</span>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: "linear-gradient(135deg, #22c55e, #16a34a)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#000", fontSize: 14, fontWeight: 700 }}>↑</span>
          </div>
        </div>
      </div>
    </div>
  );
}

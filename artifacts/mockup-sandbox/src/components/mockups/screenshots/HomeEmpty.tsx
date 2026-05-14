const PROVIDERS = [
  { name: "ChatGPT", model: "GPT-5.4", color: "#00e5b0", glow: "#00e5b035" },
  { name: "Claude", model: "Sonnet 4.6", color: "#ff6b47", glow: "#ff6b4735" },
  { name: "Gemini", model: "Flash 3", color: "#7c5fff", glow: "#7c5fff35" },
  { name: "Grok", model: "3 Beta", color: "#00d4ff", glow: "#00d4ff35" },
  { name: "DeepSeek", model: "V3", color: "#4d6bfe", glow: "#4d6bfe35" },
  { name: "Mistral", model: "Large 24", color: "#ffc400", glow: "#ffc40035" },
  { name: "Llama", model: "4 Maverick", color: "#e040fb", glow: "#e040fb35" },
  { name: "Qwen", model: "3 235B", color: "#69ff47", glow: "#69ff4735" },
];

export default function HomeEmpty() {
  return (
    <div style={{
      width: 390, height: 844, overflow: "hidden", position: "relative",
      background: "#07071a", fontFamily: "'Inter', system-ui, sans-serif", color: "#f0f0ff",
      display: "flex", flexDirection: "column",
    }}>
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(180deg, rgba(7,7,26,0.55) 0%, rgba(7,7,26,0.82) 50%, #07071a 100%)",
        backgroundImage: "url('/alley-bg.jpg')", backgroundSize: "cover", backgroundPosition: "center",
        zIndex: 0,
      }} />
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(180deg, rgba(7,7,26,0.4) 0%, rgba(7,7,26,0.75) 60%, #07071a 100%)",
        zIndex: 1,
      }} />

      {/* Status bar */}
      <div style={{ position: "relative", zIndex: 10, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 24px 0", fontSize: 13, fontWeight: 600 }}>
        <span>9:41</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span>●●●●</span>
          <span>WiFi</span>
          <span>⬛</span>
        </div>
      </div>

      {/* Logo */}
      <div style={{ position: "relative", zIndex: 10, display: "flex", justifyContent: "center", paddingTop: 18, paddingBottom: 6 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: "linear-gradient(135deg, #1a1a3e 0%, #0d0d26 100%)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 0 18px rgba(100,80,255,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontWeight: 900, fontSize: 22, letterSpacing: "-0.05em", color: "#fff" }}>Z</span>
        </div>
      </div>

      {/* Sessions list */}
      <div style={{ position: "relative", zIndex: 10, flex: 1, padding: "8px 16px", overflow: "hidden" }}>
        {[
          { prompt: "What's the best way to learn Rust?", time: "2h ago" },
          { prompt: "Explain quantum entanglement simply", time: "Yesterday" },
          { prompt: "Write a cold email for B2B outreach", time: "2d ago" },
          { prompt: "Compare React vs Vue in 2025", time: "3d ago" },
        ].map((s, i) => (
          <div key={i} style={{
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 14, padding: "12px 16px", marginBottom: 10,
          }}>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, color: "rgba(240,240,255,0.9)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {s.prompt}
            </div>
            <div style={{ fontSize: 12, color: "rgba(240,240,255,0.35)" }}>{s.time} · All AI Models</div>
          </div>
        ))}
      </div>

      {/* Input bar */}
      <div style={{ position: "relative", zIndex: 10, padding: "8px 16px 12px" }}>
        <div style={{
          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 20, padding: "12px 16px",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ fontSize: 18, opacity: 0.5 }}>📎</span>
          <span style={{ flex: 1, fontSize: 15, color: "rgba(240,240,255,0.35)" }}>Ask All AI Models…</span>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: "linear-gradient(135deg, #22c55e, #16a34a)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ color: "#000", fontSize: 16, fontWeight: 700 }}>↑</span>
          </div>
        </div>
        {/* Quota bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 8, paddingBottom: 4 }}>
          <span style={{ fontSize: 12, color: "rgba(240,240,255,0.4)" }}>⚡</span>
          <span style={{ fontSize: 12, color: "rgba(240,240,255,0.4)" }}>7 / 10 free</span>
          <div style={{ flex: 1, height: 2, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ width: "70%", height: "100%", background: "#22c55e", borderRadius: 2 }} />
          </div>
          <span style={{ fontSize: 12, color: "#ffd700", fontWeight: 600 }}>Upgrade →</span>
        </div>
      </div>
    </div>
  );
}

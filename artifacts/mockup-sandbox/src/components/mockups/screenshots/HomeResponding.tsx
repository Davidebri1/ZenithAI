const PROVIDERS = [
  { name: "ChatGPT", model: "GPT-5.4", color: "#00e5b0", glow: "#00e5b040", text: "The most efficient approach involves breaking the problem into smaller subproblems. Start by identifying the core constraint, then work backward from the desired outcome..." },
  { name: "Claude", model: "Sonnet 4.6", color: "#ff6b47", glow: "#ff6b4740", text: "I'd recommend a three-phase strategy. First, establish clear success metrics. Second, identify your constraints early. Third, iterate quickly on the solution space..." },
  { name: "Gemini", model: "Flash 3", color: "#7c5fff", glow: "#7c5fff40", text: "Based on current research, there are four key principles to keep in mind. The first and perhaps most critical is ensuring you have robust feedback loops in place..." },
  { name: "Grok", model: "3 Beta", color: "#00d4ff", glow: "#00d4ff40", text: "Let's cut to the chase. The data shows three approaches work consistently well. The fastest path to a solution typically involves..." },
  { name: "DeepSeek", model: "V3", color: "#4d6bfe", glow: "#4d6bfe40", text: "From a technical standpoint, the optimal solution requires careful consideration of time and space complexity. Here's a systematic breakdown..." },
  { name: "Mistral", model: "Large 24", color: "#ffc400", glow: "#ffc40040", text: "The European perspective on this problem tends to emphasize process over outcome. Let me walk you through a structured framework..." },
  { name: "Llama", model: "4 Maverick", color: "#e040fb", glow: "#e040fb40", text: "Drawing from open-source best practices, the community consensus points to a hybrid approach. This has been validated across numerous production systems..." },
  { name: "Qwen", model: "3 235B", color: "#69ff47", glow: "#69ff4740", text: "Analyzing this from multiple angles reveals an interesting pattern. The synthesis of Eastern and Western approaches suggests a balanced method..." },
];

export default function HomeResponding() {
  return (
    <div style={{
      width: 390, height: 844, overflow: "hidden", position: "relative",
      background: "#07071a", fontFamily: "'Inter', system-ui, sans-serif", color: "#f0f0ff",
      display: "flex", flexDirection: "column",
    }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(7,7,26,0.6) 0%, rgba(7,7,26,0.9) 100%)", zIndex: 0 }} />

      {/* Status bar */}
      <div style={{ position: "relative", zIndex: 10, display: "flex", justifyContent: "space-between", padding: "14px 24px 0", fontSize: 13, fontWeight: 600 }}>
        <span>9:41</span>
        <div style={{ display: "flex", gap: 6 }}>
          <span>●●●●</span><span>WiFi</span><span>⬛</span>
        </div>
      </div>

      {/* Logo */}
      <div style={{ position: "relative", zIndex: 10, display: "flex", justifyContent: "center", paddingTop: 10, paddingBottom: 4 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #1a1a3e, #0d0d26)", border: "1px solid rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontWeight: 900, fontSize: 18, color: "#fff" }}>Z</span>
        </div>
      </div>

      {/* Synthesize button */}
      <div style={{ position: "relative", zIndex: 10, padding: "6px 16px 8px" }}>
        <div style={{
          background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.3)",
          borderRadius: 12, padding: "10px 16px",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <span style={{ fontSize: 15 }}>✦</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#ffd700" }}>Synthesize All Responses</span>
        </div>
      </div>

      {/* Card grid */}
      <div style={{
        position: "relative", zIndex: 10, flex: 1,
        padding: "0 10px", overflow: "hidden",
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8,
        alignContent: "start",
      }}>
        {PROVIDERS.map((p) => (
          <div key={p.name} style={{
            background: "rgba(255,255,255,0.04)",
            border: `1px solid ${p.color}55`,
            borderRadius: 14, overflow: "hidden",
            boxShadow: `0 0 12px ${p.glow}`,
          }}>
            {/* Header */}
            <div style={{
              background: `${p.color}18`,
              borderBottom: `1px solid ${p.color}30`,
              padding: "6px 10px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: p.color }}>{p.name}</span>
              <span style={{ fontSize: 10, color: "rgba(240,240,255,0.4)" }}>{p.model}</span>
            </div>
            {/* Text */}
            <div style={{ padding: "8px 10px" }}>
              <p style={{ fontSize: 11, lineHeight: 1.5, color: "rgba(240,240,255,0.75)", margin: 0, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical" }}>
                {p.text}
              </p>
            </div>
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

export default function Support() {
  return (
    <div style={{ fontFamily: "'Inter', 'Helvetica Neue', sans-serif", background: "#050510", minHeight: "100vh", color: "#f0f0ff" }}>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 48px", borderBottom: "1px solid rgba(255,255,255,0.06)", position: "sticky", top: 0, background: "rgba(5,5,16,0.92)", backdropFilter: "blur(12px)", zIndex: 100 }}>
        <a href="/dreamtop/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #22c55e, #16a34a)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#000", fontWeight: 900, fontSize: 16 }}>D</span>
          </div>
          <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-0.02em" }}>Dreamtop LLC</span>
        </a>
        <a href="/dreamtop/" style={{ fontSize: 14, color: "rgba(240,240,255,0.6)", textDecoration: "none" }}>← Back</a>
      </nav>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "64px 24px 96px" }}>
        <h1 style={{ fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 900, letterSpacing: "-0.03em", marginBottom: 16 }}>Support</h1>
        <p style={{ fontSize: 16, color: "rgba(240,240,255,0.55)", lineHeight: 1.7, marginBottom: 56 }}>
          We're a small team and we respond to every message.
        </p>

        <div style={{ display: "grid", gap: 16, marginBottom: 56 }}>
          {[
            { q: "How do I cancel my Pro subscription?", a: "Open the app → Settings → Manage Subscription, or cancel directly through your App Store / Google Play subscription settings. You'll retain Pro access until the end of your billing period." },
            { q: "My AI responses stopped loading. What do I do?", a: "Check your internet connection first. If the issue persists, force-close and reopen the app. If it still doesn't work, email us with your device model and iOS/Android version." },
            { q: "How do I delete my account and data?", a: "Email dreamtopllc@gmail.com with the subject line 'Delete my account'. We'll process it within 30 days and confirm when it's done." },
            { q: "I was charged but I'm still on the Free plan.", a: "This is usually a sync delay. Force-close and reopen the app. If it's still showing Free after 5 minutes, email us with your Apple ID or Google account email and we'll fix it immediately." },
            { q: "Can I use Zenith on multiple devices?", a: "Yes — sign in with the same account on any device. Your session history syncs automatically." },
          ].map(({ q, a }) => (
            <div key={q} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "24px 28px" }}>
              <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>{q}</p>
              <p style={{ fontSize: 14, color: "rgba(240,240,255,0.55)", lineHeight: 1.7 }}>{a}</p>
            </div>
          ))}
        </div>

        <div style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 16, padding: "36px 40px", textAlign: "center" }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Still need help?</h2>
          <p style={{ color: "rgba(240,240,255,0.5)", marginBottom: 24, fontSize: 15 }}>Email us directly — we typically respond within 24 hours.</p>
          <a href="mailto:dreamtopllc@gmail.com" style={{ display: "inline-block", background: "linear-gradient(90deg, #22c55e, #16a34a)", color: "#000", fontWeight: 800, fontSize: 15, padding: "14px 32px", borderRadius: 12, textDecoration: "none" }}>
            dreamtopllc@gmail.com
          </a>
        </div>
      </main>

      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "24px 48px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, color: "rgba(240,240,255,0.3)" }}>
        <span>© 2026 Dreamtop LLC. All rights reserved.</span>
        <span>Built in the USA 🇺🇸</span>
      </footer>
    </div>
  );
}

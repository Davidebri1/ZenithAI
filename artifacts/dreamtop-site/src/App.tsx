import { Router, Route, Switch } from "wouter";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Support from "./pages/Support";

function MainPage() {
  return (
    <div style={{ fontFamily: "'Inter', 'Helvetica Neue', sans-serif", background: "#050510", minHeight: "100vh", color: "#f0f0ff" }}>
      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 48px", borderBottom: "1px solid rgba(255,255,255,0.06)", position: "sticky", top: 0, background: "rgba(5,5,16,0.92)", backdropFilter: "blur(12px)", zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #22c55e, #16a34a)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#000", fontWeight: 900, fontSize: 16 }}>D</span>
          </div>
          <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-0.02em" }}>Dreamtop LLC</span>
        </div>
        <div style={{ display: "flex", gap: 32, fontSize: 14, color: "rgba(240,240,255,0.6)" }}>
          <a href="#products" style={{ color: "inherit", textDecoration: "none" }}>Products</a>
          <a href="#about" style={{ color: "inherit", textDecoration: "none" }}>About</a>
          <a href="#contact" style={{ color: "inherit", textDecoration: "none" }}>Contact</a>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ textAlign: "center", padding: "100px 24px 80px", maxWidth: 760, margin: "0 auto" }}>
        <div style={{ display: "inline-block", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 100, padding: "6px 16px", fontSize: 13, color: "#22c55e", fontWeight: 600, marginBottom: 28 }}>
          Technology &amp; Software
        </div>
        <h1 style={{ fontSize: "clamp(36px, 6vw, 64px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: 24 }}>
          Tools that make you<br />
          <span style={{ background: "linear-gradient(90deg, #22c55e, #4ade80)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>think differently</span>
        </h1>
        <p style={{ fontSize: 18, color: "rgba(240,240,255,0.55)", lineHeight: 1.7, maxWidth: 560, margin: "0 auto 40px" }}>
          Dreamtop LLC builds intelligent software products that expand how people access, compare, and apply information.
        </p>
        <a href="#products" style={{ display: "inline-block", background: "linear-gradient(90deg, #22c55e, #16a34a)", color: "#000", fontWeight: 800, fontSize: 15, padding: "14px 32px", borderRadius: 12, textDecoration: "none" }}>
          See our products
        </a>
      </section>

      {/* Products */}
      <section id="products" style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 24px" }}>
        <h2 style={{ fontSize: 32, fontWeight: 800, textAlign: "center", marginBottom: 8, letterSpacing: "-0.02em" }}>Our Products</h2>
        <p style={{ textAlign: "center", color: "rgba(240,240,255,0.5)", marginBottom: 48, fontSize: 15 }}>Software built for speed, clarity, and insight</p>

        {/* Featured product */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 20, padding: "40px 48px", marginBottom: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(34,197,94,0.1)", borderRadius: 8, padding: "5px 12px", marginBottom: 20 }}>
              <span style={{ fontSize: 18 }}>⚡</span>
              <span style={{ color: "#22c55e", fontWeight: 700, fontSize: 13 }}>FLAGSHIP</span>
            </div>
            <h3 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12, letterSpacing: "-0.02em" }}>Zenith</h3>
            <p style={{ color: "rgba(240,240,255,0.6)", lineHeight: 1.7, marginBottom: 24, fontSize: 15 }}>
              Ask one question. Get simultaneous answers from All AI Models — GPT, Claude, Gemini, Grok, DeepSeek, Mistral, Llama, and Qwen — side by side in real time. See how the world's best AI thinks.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {["GPT", "Claude", "Gemini", "Grok", "DeepSeek", "Mistral", "Llama", "Qwen"].map(m => (
                <span key={m} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "4px 10px", fontSize: 12, color: "rgba(240,240,255,0.7)", fontWeight: 500 }}>{m}</span>
              ))}
            </div>
          </div>
          <div style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.12)", borderRadius: 16, padding: "32px 24px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { icon: "🔀", text: "All AI Models respond simultaneously" },
                { icon: "📱", text: "Native mobile app — iOS & Android" },
                { icon: "🧠", text: "Synthesis — consensus distilled across all responses" },
                { icon: "🔍", text: "Searchable conversation history" },
                { icon: "🔒", text: "Secure, private, no data sharing" },
              ].map(({ icon, text }) => (
                <div key={text} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14, color: "rgba(240,240,255,0.75)" }}>
                  <span style={{ fontSize: 18 }}>{icon}</span>
                  {text}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* More products placeholder */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "28px", opacity: 0.5 }}>
            <div style={{ fontSize: 24, marginBottom: 12 }}>🛠️</div>
            <h4 style={{ fontWeight: 700, marginBottom: 8 }}>More coming soon</h4>
            <p style={{ color: "rgba(240,240,255,0.45)", fontSize: 13, lineHeight: 1.6 }}>Additional products are in development. Follow us for updates.</p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "28px", opacity: 0.5 }}>
            <div style={{ fontSize: 24, marginBottom: 12 }}>🌐</div>
            <h4 style={{ fontWeight: 700, marginBottom: 8 }}>Enterprise solutions</h4>
            <p style={{ color: "rgba(240,240,255,0.45)", fontSize: 13, lineHeight: 1.6 }}>Custom AI tooling for teams and organizations. Get in touch.</p>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" style={{ background: "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "80px 24px" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 20, letterSpacing: "-0.02em" }}>About Dreamtop LLC</h2>
          <p style={{ color: "rgba(240,240,255,0.6)", lineHeight: 1.8, fontSize: 16, marginBottom: 16 }}>
            Dreamtop LLC is an independent technology company focused on building consumer and professional software products powered by modern AI. We believe the most valuable tools are the ones that help people think more clearly, compare more honestly, and decide more confidently.
          </p>
          <p style={{ color: "rgba(240,240,255,0.6)", lineHeight: 1.8, fontSize: 16 }}>
            Founded with a commitment to simplicity and transparency, we build products that respect the user's time and intelligence.
          </p>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" style={{ maxWidth: 600, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
        <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12, letterSpacing: "-0.02em" }}>Get in Touch</h2>
        <p style={{ color: "rgba(240,240,255,0.5)", marginBottom: 32, fontSize: 15 }}>For business inquiries, partnerships, or enterprise licensing</p>
        <a href="mailto:dreamtopllc@gmail.com" style={{ display: "inline-block", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e", fontWeight: 700, fontSize: 16, padding: "16px 36px", borderRadius: 12, textDecoration: "none", letterSpacing: "-0.01em" }}>
          dreamtopllc@gmail.com
        </a>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "24px 48px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, color: "rgba(240,240,255,0.3)" }}>
        <span>© 2026 Dreamtop LLC. All rights reserved.</span>
        <div style={{ display: "flex", gap: 24 }}>
          <a href="/dreamtop/privacy" style={{ color: "inherit", textDecoration: "none" }}>Privacy Policy</a>
          <a href="/dreamtop/support" style={{ color: "inherit", textDecoration: "none" }}>Support</a>
          <span>Built in the USA 🇺🇸</span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <Router base="/dreamtop">
      <Switch>
        <Route path="/privacy" component={PrivacyPolicy} />
        <Route path="/support" component={Support} />
        <Route component={MainPage} />
      </Switch>
    </Router>
  );
}

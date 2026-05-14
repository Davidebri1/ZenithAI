export default function PrivacyPolicy() {
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
        <p style={{ fontSize: 13, color: "rgba(240,240,255,0.35)", marginBottom: 12 }}>Last updated: May 2026</p>
        <h1 style={{ fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 900, letterSpacing: "-0.03em", marginBottom: 16 }}>Privacy Policy</h1>
        <p style={{ fontSize: 16, color: "rgba(240,240,255,0.55)", lineHeight: 1.7, marginBottom: 48 }}>
          This policy applies to the Zenith mobile application and all services operated by Dreamtop LLC.
        </p>

        {[
          {
            title: "What we collect",
            body: `Zenith collects only what is necessary to provide the service:

• Account information — your email address, collected via Clerk (our authentication provider) when you create an account.
• Conversation data — prompts you send and AI responses are stored on our servers to support session history and the Synthesis feature. We do not read or use this content for any purpose other than displaying it to you.
• Payment information — processed entirely by Stripe. Dreamtop LLC never sees or stores your card details.
• Usage data — anonymous prompt counts used to enforce free-tier quotas. No content is attached to these counts.`,
          },
          {
            title: "What we do not collect",
            body: `• We do not collect your name, phone number, location, or device identifiers.
• We do not track you across other apps or websites.
• We do not sell your data to any third party, ever.
• We do not use your conversations to train AI models.`,
          },
          {
            title: "Third-party services",
            body: `Zenith integrates the following third-party services, each governed by their own privacy policies:

• Clerk (auth.clerk.com) — authentication and account management
• Stripe (stripe.com) — payment processing for Pro subscriptions
• OpenAI, Anthropic, Google, xAI, DeepSeek, Mistral AI, Meta (Llama), Alibaba (Qwen) — AI model providers that process your prompts to generate responses. Your prompts are transmitted to these services to produce answers. Please review their respective privacy policies if you have concerns about how they handle input data.`,
          },
          {
            title: "Data storage and retention",
            body: `Conversation history is stored in a PostgreSQL database hosted in the United States. You can delete your account and all associated data at any time by contacting us at dreamtopllc@gmail.com. We will process deletion requests within 30 days.`,
          },
          {
            title: "Children",
            body: `Zenith is not directed at children under 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal information, contact us and we will delete it promptly.`,
          },
          {
            title: "Changes to this policy",
            body: `We may update this policy from time to time. Material changes will be communicated via the app or email. Continued use of Zenith after changes constitutes acceptance of the updated policy.`,
          },
          {
            title: "Contact",
            body: `Questions about this policy or data requests:\ndreamtopllc@gmail.com`,
          },
        ].map(({ title, body }) => (
          <section key={title} style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, letterSpacing: "-0.01em" }}>{title}</h2>
            <p style={{ fontSize: 15, color: "rgba(240,240,255,0.6)", lineHeight: 1.8, whiteSpace: "pre-line" }}>{body}</p>
          </section>
        ))}
      </main>

      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "24px 48px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, color: "rgba(240,240,255,0.3)" }}>
        <span>© 2026 Dreamtop LLC. All rights reserved.</span>
        <span>Built in the USA 🇺🇸</span>
      </footer>
    </div>
  );
}

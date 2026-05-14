function getResendApiKey(): string {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY not set");
  return key;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  try {
    const apiKey = getResendApiKey();
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.RESEND_FROM ?? "Zenith <onboarding@resend.dev>", ...opts }),
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(`Resend API ${resp.status}: ${JSON.stringify(err)}`);
    }
  } catch (err: any) {
    // Never crash the request over email failure
    console.error("[email] send failed:", err?.message ?? err);
  }
}

// ── Templates ────────────────────────────────────────────────────────────────

function base(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#07070d;font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#07070d;min-height:100vh;">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="100%" style="max-width:500px;">
        <tr><td style="padding-bottom:28px;text-align:center;">
          <span style="font-size:22px;font-weight:800;color:#f0f0ff;letter-spacing:-0.5px;"><span style="color:#74aa9c;">Z</span>enith</span>
        </td></tr>
        <tr><td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px;">
          ${body}
        </td></tr>
        <tr><td style="padding-top:22px;text-align:center;color:rgba(240,240,255,0.22);font-size:12px;line-height:1.6;">
          Zenith · zenith.app
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function quotaWarningEmail(opts: { used: number; limit: number }): { subject: string; html: string } {
  const remaining = opts.limit - opts.used;
  return {
    subject: `You've used ${opts.used} of your ${opts.limit} free Zenith prompts`,
    html: base("Running low on prompts", `
      <h1 style="margin:0 0 10px;color:#f0f0ff;font-size:20px;font-weight:800;">Almost out of prompts</h1>
      <p style="margin:0 0 24px;color:rgba(240,240,255,0.55);font-size:15px;line-height:1.6;">
        You have <strong style="color:#ffc400;">${remaining} prompt${remaining === 1 ? "" : "s"}</strong> left on your free plan.
        Upgrade to Zenith Pro for 250 prompts per month across all 8 AI models.
      </p>
      <a href="https://zenith.app" style="display:inline-block;padding:12px 28px;background:#00e5b0;border-radius:10px;color:#07070d;font-weight:800;font-size:15px;text-decoration:none;">Upgrade to Pro</a>
    `),
  };
}

export function quotaExhaustedEmail(): { subject: string; html: string } {
  return {
    subject: "You've used all your free Zenith prompts",
    html: base("Prompts used up", `
      <h1 style="margin:0 0 10px;color:#f0f0ff;font-size:20px;font-weight:800;">You're out of free prompts</h1>
      <p style="margin:0 0 24px;color:rgba(240,240,255,0.55);font-size:15px;line-height:1.6;">
        You've used all 10 of your free prompts. Upgrade to Zenith Pro to get
        <strong style="color:#00e5b0;">250 prompts per month</strong> across all 8 AI models — GPT, Claude, Gemini, Grok, DeepSeek, Mistral, Llama, and Qwen.
      </p>
      <a href="https://zenith.app" style="display:inline-block;padding:12px 28px;background:#00e5b0;border-radius:10px;color:#07070d;font-weight:800;font-size:15px;text-decoration:none;">Upgrade to Pro — $20/mo</a>
    `),
  };
}

export function contactNotifyEmail(opts: {
  name: string;
  company?: string | null;
  message: string;
  userEmail?: string;
  submittedAt: string;
}): { subject: string; html: string } {
  const companyLine = opts.company
    ? `<p style="margin:0 0 6px;color:rgba(240,240,255,0.5);font-size:14px;"><strong style="color:rgba(240,240,255,0.7);">Company:</strong> ${opts.company}</p>`
    : "";
  const emailLine = opts.userEmail
    ? `<p style="margin:0 0 6px;color:rgba(240,240,255,0.5);font-size:14px;"><strong style="color:rgba(240,240,255,0.7);">Email:</strong> ${opts.userEmail}</p>`
    : "";

  return {
    subject: `New enterprise inquiry from ${opts.name}`,
    html: base(`New inquiry — ${opts.name}`, `
      <h1 style="margin:0 0 10px;color:#f59e0b;font-size:20px;font-weight:800;">New enterprise inquiry</h1>
      <p style="margin:0 0 20px;color:rgba(240,240,255,0.45);font-size:13px;">Submitted ${opts.submittedAt}</p>

      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:20px;margin-bottom:20px;">
        <p style="margin:0 0 6px;color:rgba(240,240,255,0.5);font-size:14px;"><strong style="color:rgba(240,240,255,0.7);">Name:</strong> ${opts.name}</p>
        ${companyLine}
        ${emailLine}
      </div>

      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:20px;">
        <p style="margin:0 0 10px;color:rgba(240,240,255,0.35);font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Message</p>
        <p style="margin:0;color:rgba(240,240,255,0.8);font-size:14px;line-height:1.7;white-space:pre-wrap;">${opts.message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
      </div>
    `),
  };
}

export function contactAutoReplyEmail(opts: {
  name: string;
  company?: string | null;
  message: string;
  submittedAt: string;
}): { subject: string; html: string } {
  const companyLine = opts.company
    ? `<p style="margin:0 0 4px;color:rgba(240,240,255,0.4);font-size:13px;">Company: ${opts.company}</p>`
    : "";

  return {
    subject: "We received your Zenith inquiry",
    html: base("Message received — Zenith", `
      <h1 style="margin:0 0 10px;color:#f0f0ff;font-size:20px;font-weight:800;">Message received, ${opts.name.split(" ")[0]}.</h1>
      <p style="margin:0 0 24px;color:rgba(240,240,255,0.55);font-size:15px;line-height:1.6;">
        Thanks for reaching out. Our team will get back to you shortly about enterprise pricing and onboarding.
      </p>

      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="margin:0 0 12px;color:rgba(240,240,255,0.35);font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Your message</p>
        ${companyLine}
        <p style="margin:0 0 12px;color:rgba(240,240,255,0.4);font-size:13px;">Submitted: ${opts.submittedAt}</p>
        <p style="margin:0;color:rgba(240,240,255,0.75);font-size:14px;line-height:1.7;white-space:pre-wrap;">${opts.message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
      </div>

      <p style="margin:0;color:rgba(240,240,255,0.35);font-size:13px;line-height:1.6;">
        If you have anything to add, just reply to this email.
      </p>
    `),
  };
}

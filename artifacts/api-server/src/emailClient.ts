async function getResendCredentials(): Promise<{ apiKey: string }> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!hostname || !xReplitToken) {
    throw new Error("Resend integration not available");
  }

  const isProduction = process.env.REPLIT_DEPLOYMENT === "1";
  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set("include_secrets", "true");
  url.searchParams.set("connector_names", "resend");
  url.searchParams.set("environment", isProduction ? "production" : "development");

  const resp = await fetch(url.toString(), {
    headers: { Accept: "application/json", "X-Replit-Token": xReplitToken },
    signal: AbortSignal.timeout(8000),
  });

  if (!resp.ok) throw new Error(`Resend credentials fetch failed: ${resp.status}`);
  const data = await resp.json();
  const apiKey = data.items?.[0]?.settings?.api_key;
  if (!apiKey) throw new Error("Resend api_key not found in integration settings");
  return { apiKey };
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

const FROM = "OneAI <hello@oneai.app>";

export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  try {
    const { apiKey } = await getResendCredentials();
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: opts.to, subject: opts.subject, html: opts.html }),
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(`Resend API error ${resp.status}: ${JSON.stringify(err)}`);
    }
  } catch (err: any) {
    // Never let email failures crash the request
    console.error("[email] send failed:", err?.message ?? err);
  }
}

// ── Email templates ─────────────────────────────────────────────────────────

function baseTemplate(title: string, body: string): string {
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
      <table width="100%" style="max-width:480px;">
        <!-- Logo -->
        <tr><td style="padding-bottom:32px;text-align:center;">
          <span style="font-size:24px;font-weight:800;color:#f0f0ff;">One<span style="color:#74aa9c;">AI</span></span>
        </td></tr>
        <!-- Card -->
        <tr><td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px;">
          ${body}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding-top:24px;text-align:center;color:rgba(240,240,255,0.25);font-size:12px;line-height:1.6;">
          OneAI · Compare all AI models at once<br>
          <a href="https://oneai.app" style="color:rgba(240,240,255,0.35);text-decoration:none;">oneai.app</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function welcomeEmail(opts: { name?: string }): { subject: string; html: string } {
  const greeting = opts.name ? `Hi ${opts.name},` : "Welcome aboard,";
  return {
    subject: "Welcome to OneAI 👋",
    html: baseTemplate("Welcome to OneAI", `
      <h1 style="margin:0 0 8px;color:#f0f0ff;font-size:22px;font-weight:800;">${greeting}</h1>
      <p style="margin:0 0 20px;color:rgba(240,240,255,0.6);font-size:15px;line-height:1.6;">
        You're now on the <strong style="color:#f0f0ff;">free plan</strong> — 10 prompts to explore OneAI. Type one question and get answers from <strong style="color:#f0f0ff;">8 AI models simultaneously</strong>: GPT, Claude, Gemini, Grok, DeepSeek, Mistral, Llama & Qwen.
      </p>
      <div style="background:rgba(116,170,156,0.08);border:1px solid rgba(116,170,156,0.25);border-radius:12px;padding:16px;margin-bottom:24px;">
        <p style="margin:0;color:rgba(240,240,255,0.7);font-size:14px;line-height:1.6;">
          💡 <strong style="color:#f0f0ff;">Tip:</strong> After you get responses, tap <em>Synthesize</em> to get a single AI-generated summary across all models.
        </p>
      </div>
      <a href="https://oneai.app" style="display:block;background:#22c55e;color:#000;text-decoration:none;font-weight:800;font-size:15px;border-radius:12px;padding:14px;text-align:center;">
        Open OneAI
      </a>
    `),
  };
}

export function quotaWarningEmail(opts: { used: number; limit: number }): { subject: string; html: string } {
  const remaining = opts.limit - opts.used;
  return {
    subject: `You have ${remaining} prompt${remaining === 1 ? "" : "s"} left on OneAI`,
    html: baseTemplate("Quota Warning", `
      <h1 style="margin:0 0 8px;color:#f97316;font-size:22px;font-weight:800;">Running low</h1>
      <p style="margin:0 0 20px;color:rgba(240,240,255,0.6);font-size:15px;line-height:1.6;">
        You've used <strong style="color:#f0f0ff;">${opts.used} of ${opts.limit}</strong> free prompts. You have <strong style="color:#f97316;">${remaining} remaining</strong>.
      </p>
      <p style="margin:0 0 24px;color:rgba(240,240,255,0.6);font-size:14px;line-height:1.6;">
        Upgrade to <strong style="color:#f0f0ff;">OneAI Pro</strong> for unlimited prompts across all 8 AI models — just $14.99/month or $119/year.
      </p>
      <a href="https://oneai.app" style="display:block;background:#22c55e;color:#000;text-decoration:none;font-weight:800;font-size:15px;border-radius:12px;padding:14px;text-align:center;margin-bottom:12px;">
        Upgrade to Pro — $14.99/mo
      </a>
      <a href="https://oneai.app" style="display:block;color:rgba(240,240,255,0.4);text-decoration:none;font-size:13px;text-align:center;">
        Keep using free plan
      </a>
    `),
  };
}

export function quotaExhaustedEmail(): { subject: string; html: string } {
  return {
    subject: "You've used all your OneAI free prompts",
    html: baseTemplate("Quota Exhausted", `
      <h1 style="margin:0 0 8px;color:#ef4444;font-size:22px;font-weight:800;">Free prompts used up</h1>
      <p style="margin:0 0 20px;color:rgba(240,240,255,0.6);font-size:15px;line-height:1.6;">
        You've used all 10 free prompts. To keep comparing AI models, upgrade to <strong style="color:#f0f0ff;">OneAI Pro</strong>.
      </p>
      <div style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.25);border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="margin:0 0 4px;color:#22c55e;font-weight:800;font-size:14px;">OneAI Pro includes:</p>
        <ul style="margin:8px 0 0;padding-left:20px;color:rgba(240,240,255,0.65);font-size:14px;line-height:1.8;">
          <li>Unlimited prompts</li>
          <li>All 8 AI models (GPT, Claude, Gemini, Grok, DeepSeek, Mistral, Llama, Qwen)</li>
          <li>Synthesis — cross-model AI summaries</li>
          <li>Full session history</li>
        </ul>
      </div>
      <a href="https://oneai.app" style="display:block;background:#22c55e;color:#000;text-decoration:none;font-weight:800;font-size:15px;border-radius:12px;padding:14px;text-align:center;">
        Upgrade Now — $14.99/mo
      </a>
    `),
  };
}

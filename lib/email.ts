export interface EmailPayload {
  to:      string;
  subject: string;
  body:    string;
}

export async function sendEmail({ to, subject, body }: EmailPayload): Promise<void> {
  const html = buildHtml(subject, body);
  console.log(
    [
      "📧 EMAIL SENT",
      `To:      ${to}`,
      `Subject: ${subject}`,
      `HTML:\n${html}`,
    ].join("\n"),
  );
}

function buildHtml(subject: string, body: string): string {
  const safeBody = body.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:18px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.09);">

        <!-- Header -->
        <tr>
          <td style="background:#1E3A8A;padding:30px 44px 28px;text-align:center;">
            <p style="margin:0;font-size:24px;font-weight:900;color:#ffffff;letter-spacing:-0.04em;">
              Jumo<span style="color:#C8A55C;">Immo</span>
            </p>
            <p style="margin:7px 0 0;font-size:10px;color:rgba(255,255,255,0.50);letter-spacing:0.18em;text-transform:uppercase;">
              Immobilier entre particuliers
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:38px 44px 28px;">
            <h2 style="margin:0 0 18px;font-size:19px;font-weight:700;color:#0F172A;line-height:1.3;">
              ${subject}
            </h2>
            <div style="font-size:15px;color:#475569;line-height:1.75;">
              ${safeBody}
            </div>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="background:#ffffff;padding:4px 44px 36px;">
            <div style="height:1px;background:#E2E8F0;margin-bottom:26px;"></div>
            <a href="https://jumo-immo.fr/espace-vendeur"
               style="display:inline-block;padding:13px 30px;background:#1E3A8A;color:#ffffff;font-size:14px;font-weight:700;border-radius:10px;text-decoration:none;letter-spacing:0.01em;">
              Voir mon tableau de bord →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#F8FAFC;padding:20px 44px;border-top:1px solid #E2E8F0;text-align:center;">
            <p style="margin:0;font-size:11px;color:#94A3B8;line-height:1.7;">
              Jumo-Immo · Données DVF officielles (data.gouv.fr) · Sans commission<br>
              Vous recevez cet email car vous êtes inscrit en tant que vendeur.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

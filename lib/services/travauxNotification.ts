export interface ServiceRequestPayload {
  category:    string;
  workType:    string;
  description: string;
  photoUrls:   string[];
  contact: {
    name:  string;
    email: string;
    phone: string;
  };
}

const CATEGORY_EMOJI: Record<string, string> = {
  travaux:      "🔨",
  déménagement: "📦",
  diagnostic:   "🔍",
  courtage:     "🏦",
  assurance:    "🛡️",
};

function formatMessage(payload: ServiceRequestPayload): string {
  const emoji = CATEGORY_EMOJI[payload.category] ?? "📋";
  const lines: string[] = [
    `${emoji} Nouvelle demande · ${payload.workType}`,
    "",
    `Type : ${payload.workType}`,
    "",
    `Nom : ${payload.contact.name}`,
    "",
    `Téléphone : ${payload.contact.phone || "Non renseigné"}`,
    "",
    `Email : ${payload.contact.email}`,
    "",
    "Description :",
    payload.description,
  ];

  if (payload.photoUrls.length > 0) {
    lines.push("", "Photos :");
    payload.photoUrls.forEach(url => lines.push(url));
  }

  return lines.join("\n");
}

async function sendViaTwilio(message: string): Promise<boolean> {
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from  = process.env.TWILIO_WHATSAPP_FROM;
  const to    = process.env.ADMIN_WHATSAPP_NUMBER;

  if (!sid || !token || !from || !to) return false;

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method:  "POST",
      headers: {
        Authorization:  `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: `whatsapp:${from}`,
        To:   `whatsapp:${to}`,
        Body: message,
      }),
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[travaux] Twilio error:", res.status, text);
  }

  return res.ok;
}

async function sendViaMake(payload: ServiceRequestPayload): Promise<boolean> {
  const webhookUrl = process.env.MAKE_WEBHOOK_URL;
  if (!webhookUrl) return false;

  const res = await fetch(webhookUrl, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({
      category:    payload.category,
      workType:    payload.workType,
      description: payload.description,
      photoUrls:   payload.photoUrls,
      name:        payload.contact.name,
      email:       payload.contact.email,
      phone:       payload.contact.phone,
      sentAt:      new Date().toISOString(),
    }),
  });

  if (!res.ok) {
    console.error("[travaux] Make.com webhook error:", res.status);
  }

  return res.ok;
}

export async function sendServiceRequest(
  payload: ServiceRequestPayload,
): Promise<{ sent: boolean; provider: string }> {
  const message = formatMessage(payload);

  if (process.env.TWILIO_ACCOUNT_SID) {
    const ok = await sendViaTwilio(message);
    if (ok) return { sent: true, provider: "twilio" };
  }

  if (process.env.MAKE_WEBHOOK_URL) {
    const ok = await sendViaMake(payload);
    if (ok) return { sent: true, provider: "make" };
  }

  // Log server-side only — never expose to client
  console.log("[service-request] No provider configured:", {
    category:   payload.category,
    workType:   payload.workType,
    name:       payload.contact.name,
    email:      payload.contact.email,
    photoCount: payload.photoUrls.length,
  });
  return { sent: false, provider: "none" };
}

import { NextResponse } from "next/server";
import { emailSchema } from "@/lib/validations";
import { generateOtp } from "@/lib/otpStore";
import { sendEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = emailSchema.safeParse(body?.email);
    if (!parsed.success) {
      return NextResponse.json({ error: "Adresse e-mail invalide." }, { status: 400 });
    }
    const email = parsed.data;
    const code = generateOtp(email);

    try {
      await sendEmail({
        to: email,
        subject: "Votre code de vérification Jumo-Immo",
        body: `Votre code de vérification est : ${code}\n\nCe code est valable pendant 5 minutes.`,
      });
    } catch {
      return NextResponse.json(
        { error: "send_failed", message: "Erreur d'envoi. Vérifiez votre email." },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erreur serveur. Veuillez réessayer." }, { status: 500 });
  }
}

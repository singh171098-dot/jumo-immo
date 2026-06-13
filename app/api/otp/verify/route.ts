import { NextResponse } from "next/server";
import { emailSchema } from "@/lib/validations";
import { generateOtp, verifyOtp } from "@/lib/otpStore";
import { sendEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const emailParsed = emailSchema.safeParse(body?.email);
    const code = typeof body?.code === "string" ? body.code.trim() : "";

    if (!emailParsed.success || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: "wrong_code", message: "Code incorrect. Veuillez réessayer." },
        { status: 400 },
      );
    }

    const email = emailParsed.data;
    const status = verifyOtp(email, code);

    switch (status) {
      case "ok":
        return NextResponse.json({ success: true });

      case "expired":
      case "not_found":
        return NextResponse.json(
          { error: "expired", message: "Code expiré. Renvoyer un nouveau code." },
          { status: 410 },
        );

      case "too_many_attempts": {
        const newCode = generateOtp(email);
        await sendEmail({
          to: email,
          subject: "Votre nouveau code de vérification Jumo-Immo",
          body: `Votre nouveau code de vérification est : ${newCode}\n\nCe code est valable pendant 5 minutes.`,
        });
        return NextResponse.json(
          { error: "too_many_attempts", message: "Trop de tentatives. Nouveau code envoyé." },
          { status: 429 },
        );
      }

      case "wrong_code":
      default:
        return NextResponse.json(
          { error: "wrong_code", message: "Code incorrect. Veuillez réessayer." },
          { status: 400 },
        );
    }
  } catch {
    return NextResponse.json(
      { error: "server", message: "Erreur serveur. Veuillez réessayer." },
      { status: 500 },
    );
  }
}

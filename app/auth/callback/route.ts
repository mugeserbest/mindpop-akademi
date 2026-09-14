import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  // Yalnızca uygulama içindeki güvenli yolları kabul eder.
  const safeNext =
    next && next.startsWith("/") && !next.startsWith("//")
      ? next
      : "/dashboard?onboarding=true";

  if (code) {
    const supabase = await createClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(safeNext, origin));
    }

    console.error("E-posta doğrulama kodu değiştirilemedi:", error.message);
  } else {
    console.error("E-posta doğrulama bağlantısında kod bulunamadı.");
  }

  return NextResponse.redirect(`${origin}/?auth_error=verification_failed`);
}

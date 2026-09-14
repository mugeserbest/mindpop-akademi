import { NextResponse } from "next/server";
import { createAdminClient } from "../../../lib/supabase/admin";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { available: false, error: "Geçersiz istek." },
      { status: 400 },
    );
  }

  const username =
    typeof body === "object" &&
    body !== null &&
    "username" in body &&
    typeof body.username === "string"
      ? body.username.trim()
      : "";

  if (username.length < 3 || username.length > 30) {
    return NextResponse.json({ available: false });
  }

  const supabaseAdmin = createAdminClient();

  const { data, error } = await supabaseAdmin.rpc(
    "is_username_available",
    {
      requested_username: username,
    },
  );

  if (error) {
    console.error("Kullanıcı adı kontrol hatası:", error.message);

    return NextResponse.json(
      { available: false, error: "Kullanıcı adı kontrol edilemedi." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    available: data === true,
  });
}
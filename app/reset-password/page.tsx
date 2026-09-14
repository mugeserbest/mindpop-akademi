"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const passwordsMatch =
    newPassword.length >= 6 && newPassword === confirmPassword;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!passwordsMatch || isSaving) {
      return;
    }

    setIsSaving(true);
    setMessage("");

    const supabase = createClient();

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setMessage(
        "Şifre güncellenemedi. Bağlantının süresi dolmuş olabilir; yeniden sıfırlama iste.",
      );
      setIsSaving(false);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-5 py-10">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-card bg-white p-6 shadow-card sm:p-8"
      >
        <h1 className="font-heading text-3xl font-extrabold text-main-purple">
          Yeni şifre oluştur
        </h1>

        <p className="mt-3 font-body text-sm leading-relaxed text-grey">
          Hesabın için güçlü ve daha önce kullanmadığın bir şifre belirle.
        </p>

        <label className="mt-6 grid gap-2">
          <span className="font-body text-sm font-bold text-black">
            Yeni şifre
          </span>

          <input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="min-h-11 rounded-button border-card bg-white px-4 font-body text-sm text-black outline-none focus:border-main-purple"
          />
        </label>

        <label className="mt-4 grid gap-2">
          <span className="font-body text-sm font-bold text-black">
            Yeni şifre tekrar
          </span>

          <input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="min-h-11 rounded-button border-card bg-white px-4 font-body text-sm text-black outline-none focus:border-main-purple"
          />
        </label>

        {confirmPassword && !passwordsMatch && (
          <p className="mt-3 font-body text-xs font-bold text-dark-red">
            Şifreler aynı olmalı ve en az 6 karakter içermeli.
          </p>
        )}

        {message && (
          <p className="mt-3 font-body text-sm font-bold text-dark-red">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={!passwordsMatch || isSaving}
          className="mt-6 min-h-11 w-full rounded-button bg-main-purple px-5 font-body text-sm font-bold text-white transition hover:bg-dark-purple disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Güncelleniyor..." : "Şifreyi Güncelle"}
        </button>
      </form>
    </main>
  );
}

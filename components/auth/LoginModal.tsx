"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Button from "../button";
import Modal from "../Modal";
import { createClient } from "@/lib/supabase/client";

type LoginModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function LoginModal({ open, onClose }: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function handleClose() {
    setMessage("");
    setIsLoading(false);
    onClose();
    setEmail("");
  }

  async function handleForgotPassword() {
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setMessage("Önce e-posta adresini yaz.");
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.resetPasswordForEmail(
        normalizedEmail,
        {
          redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        },
      );

      if (error) {
        console.error(
          "Şifre sıfırlama e-postası gönderilemedi:",
          error.message,
        );
      }

      // Hesabın varlığını açıklamamak için her durumda aynı mesajı gösterir.
      setMessage("Bu e-posta kayıtlıysa şifre yenileme bağlantısı gönderildi.");
    } catch {
      setMessage("Şifre yenileme e-postası şu anda gönderilemedi.");
    } finally {
      setIsLoading(false);
    }
  }
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email"));
    const password = String(formData.get("password"));

    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const result = (await response.json()) as {
        success: boolean;
        error?: string;
      };

      if (!response.ok) {
        setMessage(result.error ?? "Giriş sırasında bir hata oluştu.");
        return;
      }

      window.location.replace("/dashboard");
    } catch {
      setMessage("Giriş sistemiyle bağlantı kurulamadı. Lütfen tekrar dene.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Modal open={open} title="Tekrar Hoş Geldin!" onClose={handleClose}>
      <form
        onSubmit={handleSubmit}
        className="mx-auto grid w-full max-w-md gap-4"
      >
        <p className="font-body text-sm leading-relaxed text-grey">
          Öğrenme macerana kaldığın yerden devam etmek için giriş yap.
        </p>

        <label className="grid gap-1">
          <span className="font-body text-sm font-bold text-black">
            E-posta
          </span>

          <input
            name="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            className="min-h-11 rounded-button border-card bg-white px-4 font-body text-sm text-black outline-none focus:border-main-purple"
          />
        </label>

        <label className="grid gap-1">
          <span className="font-body text-sm font-bold text-black">Parola</span>

          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="min-h-11 rounded-button border-card bg-white px-4 font-body text-sm text-black outline-none focus:border-main-purple"
          />
        </label>
        <button
          type="button"
          onClick={handleForgotPassword}
          disabled={isLoading}
          className="w-fit font-body text-sm font-bold text-main-purple transition hover:text-dark-purple disabled:opacity-60"
        >
          Şifremi unuttum
        </button>

        {message && (
          <p className="font-body text-sm text-dark-red" role="alert">
            {message}
          </p>
        )}

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? "Giriş yapılıyor..." : "Giriş Yap"}
        </Button>
      </form>
    </Modal>
  );
}

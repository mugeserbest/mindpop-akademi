"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import LoginModal from "../auth/LoginModal";

export default function StartJourney() {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const learningGoal = String(formData.get("learningGoal"));
    const username = String(formData.get("username"));
    const email = String(formData.get("email"));
    const password = String(formData.get("password"));

    setIsLoading(true);
    setMessage("");

    const supabase = createClient();
    const normalizedUsername = username.trim();

    try {
      const usernameResponse = await fetch("/api/username-availability", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: normalizedUsername,
        }),
      });

      const usernameResult = (await usernameResponse.json()) as {
        available: boolean;
      };

      if (!usernameResponse.ok) {
        setIsLoading(false);
        setMessage(
          "Kullanıcı adı şu anda kontrol edilemedi. Lütfen tekrar dene.",
        );
        return;
      }

      if (!usernameResult.available) {
        setIsLoading(false);
        setMessage(
          "Bu kullanıcı adı kullanılıyor veya 3-30 karakter arasında değil.",
        );
        return;
      }
    } catch {
      setIsLoading(false);
      setMessage(
        "Kullanıcı adı şu anda kontrol edilemedi. Lütfen tekrar dene.",
      );
      return;
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: normalizedUsername,
          learning_goal: learningGoal,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setIsLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setIsSubmitted(true);

    form.reset();
  }

  return (
    <section id="basla" className="bg-cream px-5 py-16 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-center font-heading text-3xl font-extrabold text-pink sm:text-4xl">
          Öğrenme Macerasına İlk Adımını At
        </h2>

        <div className="mt-10 grid items-center gap-10 lg:grid-cols-2">
          <div className="mx-auto w-full max-w-56 sm:max-w-xs">
            <Image
              src="/images/pop-icon/heyecanli-icon.png"
              alt="Seni maceraya davet eden Pop karakteri"
              width={440}
              height={440}
              unoptimized
              className="h-auto w-full object-contain"
            />
          </div>

          {isSubmitted ? (
            <div className="mx-auto w-full max-w-md rounded-card bg-white p-8 text-center shadow-card">
              <p className="font-heading text-2xl font-extrabold text-main-purple">
                E-postanı doğrula
              </p>

              <p className="mt-3 font-body leading-relaxed text-grey">
                Doğrulama bağlantısını e-posta adresine gönderdik. Bağlantıya
                tıkladığında Pop seni karşılayacak ve yolculuğunu birlikte
                planlayacak.
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="mx-auto grid w-full max-w-md gap-4 rounded-card bg-white p-6 shadow-card sm:p-8"
            >
              <p className="font-body text-sm leading-relaxed text-grey">
                Hedefini yaz. Pop senin için en iyi yol haritasını oluştursun.
                Maceran şimdi başlasın.
              </p>

              <label className="grid gap-1">
                <span className="sr-only">Öğrenmek istediğin konu</span>
                <input
                  name="learningGoal"
                  type="text"
                  required
                  placeholder="Öğrenmek istediğin konuyu yaz"
                  className="min-h-11 rounded-button border-card bg-white px-4 font-body text-sm text-black outline-none placeholder:text-grey focus:border-main-purple"
                />
              </label>

              <label className="grid gap-1">
                <span className="sr-only">Kullanıcı adı</span>
                <input
                  name="username"
                  type="text"
                  required
                  placeholder="Kullanıcı adı"
                  className="min-h-11 rounded-button border-card bg-white px-4 font-body text-sm text-black outline-none placeholder:text-grey focus:border-main-purple"
                />
              </label>

              <label className="grid gap-1">
                <span className="sr-only">E-posta</span>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="E-posta"
                  className="min-h-11 rounded-button border-card bg-white px-4 font-body text-sm text-black outline-none placeholder:text-grey focus:border-main-purple"
                />
              </label>

              <label className="grid gap-1">
                <span className="sr-only">Parola</span>
                <input
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  placeholder="Parola"
                  className="min-h-11 rounded-button border-card bg-white px-4 font-body text-sm text-black outline-none placeholder:text-grey focus:border-main-purple"
                />
              </label>

              {message && (
                <p className="font-body text-sm text-dark-purple" role="status">
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 min-h-11 rounded-button bg-main-purple px-5 font-body text-sm font-bold text-white transition hover:bg-dark-purple disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? "Hesap oluşturuluyor..." : "Yolculuğumu Oluştur"}
              </button>
              <p className="text-center font-body text-sm text-grey">
                Zaten üye misin?{" "}
                <button
                  type="button"
                  onClick={() => setIsLoginOpen(true)}
                  className="font-bold text-main-purple transition hover:text-dark-purple"
                >
                  Giriş yap
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
      <LoginModal open={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </section>
  );
}

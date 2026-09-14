"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import LoginModal from "../auth/LoginModal";

export default function LandingHeader() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  return (
    <>
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" aria-label="Mindpop Akademi ana sayfa">
          <Image
            src="/images/logo/yatay-logo.png"
            alt="Mindpop Akademi"
            width={190}
            height={44}
            className="h-auto w-36 sm:w-44"
            priority
          />
        </Link>

        <nav aria-label="Ana menü" className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsLoginOpen(true)}
            className="rounded-button px-3 py-2 font-body text-xs font-bold text-black transition hover:text-main-purple sm:px-4 sm:text-sm"
          >
            Giriş Yap
          </button>

          <Link
            href="#basla"
            className="rounded-button bg-main-purple px-4 py-2 font-body text-xs font-bold text-white transition hover:bg-dark-purple sm:px-5 sm:text-sm"
          >
            Kayıt Ol
          </Link>
        </nav>
      </header>

      <LoginModal open={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </>
  );
}

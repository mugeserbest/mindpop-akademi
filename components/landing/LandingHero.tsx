"use client";

import Image from "next/image";
import type { FormEvent } from "react";
import { useState } from "react";

export default function LandingHero() {
  const [goal, setGoal] = useState("");

  function handleStartJourney(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const startSection = document.getElementById("basla");

    const learningGoalInput = startSection?.querySelector<HTMLInputElement>(
      'input[name="learningGoal"]',
    );

    if (learningGoalInput && goal.trim()) {
      learningGoalInput.value = goal.trim();
    }

    startSection?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <section
      aria-labelledby="landing-hero-title"
      className="overflow-hidden bg-white px-5 pb-16 pt-8 sm:px-8 lg:pb-24"
    >
      <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2">
        <div className="max-w-xl">
          <h1
            id="landing-hero-title"
            className="font-heading text-5xl font-extrabold uppercase leading-tight text-black sm:text-5xl lg:text-6xl"
          >
            Öğrenmeyi
            <span className="block text-pink">maceraya</span>
            dönüştür
          </h1>

          <p className="mt-5 max-w-md font-body text-sm leading-relaxed text-grey sm:text-base">
            Pop, hedefini sana özel bir yol haritasına çevirir. Görevleri
            tamamla, XP kazan ve seviyeni yükseltirken öğrenmenin keyfini çıkar.
          </p>

          <form
            onSubmit={handleStartJourney}
            className="mt-7 flex flex-col gap-3 sm:flex-row"
          >
            <label className="sr-only" htmlFor="landing-goal">
              Öğrenme hedefin
            </label>



            <button
              type="submit"
              className="inline-flex min-h-12 items-center justify-center rounded-button bg-main-purple px-6 font-body text-sm font-bold text-white transition hover:bg-dark-purple"
            >
              Yolculuğu Başlat
            </button>
          </form>
        </div>

        <div className="relative mx-auto w-full max-w-xs lg:max-w-md">
          <Image
            src="/images/pop-icon/el-sallayan-icon.png"
            alt="Seni karşılayan Pop karakteri"
            width={560}
            height={560}
            priority
            unoptimized
            className="h-auto w-full object-contain"
          />
        </div>
      </div>
    </section>
  );
}

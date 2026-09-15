import Image from "next/image";
import Link from "next/link";

export default function LandingFooter() {
  return (
    <footer className="border-t border-beige bg-white px-5 py-8 sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
        <Link href="/" aria-label="Mindpop Akademi ana sayfa">
          <Image
            src="/images/logo/yatay-logo.png"
            alt="Mindpop Akademi"
            width={190}
            height={44}
            className="h-auto w-36"
          />
        </Link>

        <div className="flex flex-col items-center gap-1 font-body text-xs text-grey sm:items-end">
          <a
            href="mailto:destek@mindpopakademi.com.tr"
            className="transition-colors hover:text-purple"
          >
            İletişim: destek@mindpopakademi.com.tr
          </a>
          <p>© 2026 Mindpop Akademi. Öğrenmeyi maceraya dönüştür.</p>
        </div>
      </div>
    </footer>
  );
}

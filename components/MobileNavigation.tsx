"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: "/images/icons/ana-panel.svg",
  },
  {
    label: "Akademi",
    href: "/akademi",
    icon: "/images/icons/akademi.svg",
  },
  {
    label: "Yolculuğum",
    href: "/yolculugum",
    icon: "/images/icons/yolculugum.svg",
  },
  {
    label: "Profil",
    href: "/profil",
    icon: "/images/icons/profil.svg",
  },
];

export default function MobileNavigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobil menü"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-beige bg-white/95 px-2 py-2 backdrop-blur lg:hidden"
    >
      <ul className="grid grid-cols-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-1 rounded-button px-2 py-2 text-center font-body text-xs font-bold transition ${
                  isActive
                    ? "bg-cream text-main-purple"
                    : "text-grey hover:bg-cream hover:text-main-purple"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`h-5 w-5 ${
                    isActive ? "bg-main-purple" : "bg-grey"
                  }`}
                  style={{
                    maskImage: `url(${item.icon})`,
                    WebkitMaskImage: `url(${item.icon})`,
                    maskRepeat: "no-repeat",
                    WebkitMaskRepeat: "no-repeat",
                    maskPosition: "center",
                    WebkitMaskPosition: "center",
                    maskSize: "contain",
                    WebkitMaskSize: "contain",
                  }}
                />

                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

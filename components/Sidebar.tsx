"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ProgressBar from "./ProgressBar";
import BodyText from "./BodyText";
import SectionTitle from "./SectionTitle";

type SidebarProps = {
  level: number;
  currentXp: number;
  xpGoal: number;
  world: {
    name: string;
    image: string;
  };
};
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
export default function Sidebar({
  level,
  currentXp,
  xpGoal,
  world,
}: SidebarProps) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col overflow-y-auto rounded-card border-card bg-cream p-4 pt-8 shadow-sm lg:flex">
      <Link href="/dashboard" aria-label="Mindpop Akademi ana sayfası">
        <Image
          src="/images/logo/yatay-logo.png"
          alt="Mindpop Akademi"
          width={208}
          height={36}
          className="h-auto w-[208px]"
          loading="eager"
        />
      </Link>

      <nav aria-label="Ana menü" className="mt-10 flex-1">
        <ul className="space-y-7">
          {navigation.map((item) => {
            const isActive = pathname === item.href;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-button px-4 py-3 text-base font-bold transition ${
                    isActive
                      ? "bg-main-purple text-cream shadow-sm border-card"
                      : "text-grey hover:bg-white hover:text-main-purple hover:border-card"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`h-6 w-6 shrink-0 ${
                      isActive
                        ? "bg-cream"
                        : "bg-main-purple hover:bg-main-purple"
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
      <div className="mt-auto rounded-card border-card shadow-sm  bg-white p-4 text-center">
        <Image
          src={world.image}
          alt={`${world.name} dünyası`}
          width={160}
          height={103}
          className="mx-auto h-auto w-full max-w-[160px] object-contain"
        />

        <div className="mt-3">
          <SectionTitle as="h3" title={world.name} className="mx-auto w-fit" />

          <BodyText size="sm" weight="semibold" tone="muted" className="mt-1 ">
            Seviye {level}
          </BodyText>
        </div>

        <ProgressBar currentXp={currentXp} xpGoal={xpGoal} />
      </div>
    </aside>
  );
}

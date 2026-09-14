"use client";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BadgesCard from "../BadgesCard";
import { badges } from "../../data/Badges";
import Avatars from "../Avatars";
import { avatars } from "../../data/Avatars";
import ProfileCard from "../ProfileCard";
import ChangePasswordModal from "../ChangePasswordModal";

type ProfileClientProps = {
  initialUserName: string;
  initialEmail: string;
  initialAvatarId: string;
  totalXp: number;
  completedWorldCount: number;
  earnedTitleCount: number;
  selectedTitle: string;
  earnedBadgeKeys: string[];
  openedWorldThemes: string[];
  loginStreak: number;
};

export default function ProfileClient({
  initialUserName,
  initialEmail,
  initialAvatarId,
  totalXp,
  completedWorldCount,
  earnedTitleCount,
  selectedTitle,
  earnedBadgeKeys,
  openedWorldThemes,
  loginStreak,
}: ProfileClientProps) {
  const [selectedAvatarId, setSelectedAvatarId] = useState(initialAvatarId);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const router = useRouter();

  async function handleSignOut() {
    const isConfirmed = window.confirm("Çıkış yapmak istediğine emin misin?");

    if (!isConfirmed) {
      return;
    }
    const supabase = createClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Çıkış yapılamadı:", error.message);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  async function handleAvatarSelect(avatarId: string) {
    const previousAvatarId = selectedAvatarId;

    // Seçimi hemen ekranda gösterir.
    setSelectedAvatarId(avatarId);

    try {
      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ avatarId }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Avatar kaydedilemedi.");
      }
    } catch (error) {
      // Sunucu reddederse eski avatara geri döner.
      setSelectedAvatarId(previousAvatarId);

      console.error(
        "Avatar kaydedilemedi:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  const openedWorldThemeSet = new Set(openedWorldThemes);

  const userAvatars = avatars.map((avatar) => ({
    ...avatar,
    unlocked: avatar.unlockTheme
      ? openedWorldThemeSet.has(avatar.unlockTheme)
      : true,
  }));

  const selectedAvatar =
    userAvatars.find((avatar) => avatar.id === selectedAvatarId) ??
    userAvatars[0];

  const earnedBadgeKeySet = new Set(earnedBadgeKeys);

  const userBadges = badges.map((badge) => ({
    ...badge,
    unlocked: earnedBadgeKeySet.has(badge.id),
  }));

  return (
    <main className="app-page">
      <div className="mx-auto grid w-full max-w-7xl gap-6">
        <ProfileCard
          avatar={selectedAvatar.largeImage}
          userName={initialUserName}
          email={initialEmail}
          role={selectedTitle}
          stats={[
            {
              label: "Tamamlanan Dünya",
              value: String(completedWorldCount),
              icon: "/images/icons/toplam-sure.png",
            },
            {
              label: "Kazanılan Unvan",
              value: String(earnedTitleCount),
              icon: "/images/icons/ogrenilmis-beceri.png",
            },
            {
              label: "Toplam XP",
              value: `${totalXp} XP`,
              icon: "/images/icons/toplam-xp.png",
            },
            {
              label: "Giriş Serisi",
              value: `${loginStreak} gün`,
              icon: "/images/icons/en-uzun-seri.png",
            },
          ]}
          onChangePassword={() => setIsChangePasswordOpen(true)}
          onSignOut={handleSignOut}
        />
        <Avatars
          avatars={userAvatars}
          selectedAvatarId={selectedAvatarId}
          onSelectAvatar={handleAvatarSelect}
        />
        <div className="mx-auto flex w-full flex-col items-center gap-6 lg:flex-row">
          <div className="w-full">
            <BadgesCard badges={userBadges} type="wide" />
          </div>
          <Image
            src="/images/pop-icon/kutlayan-icon.png"
            alt=""
            width={180}
            height={160}
            unoptimized
            className="h-auto w-36 object-contain sm:w-60"
          />
        </div>
      </div>
      <ChangePasswordModal
        open={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </main>
  );
}

import { redirect } from "next/navigation";
import ProfileClient from "../../../components/profile/ProfileClient";
import { getAcademyData } from "../../../lib/data/academy";
import { createAdminClient } from "../../../lib/supabase/admin";

export default async function ProfilPage() {
  const data = await getAcademyData();

  // Giriş yoksa ana sayfaya gönderir.
  if (!data) {
    redirect("/");
  }

  const adminSupabase = createAdminClient();

  const { data: loginStreak, error: loginStreakError } =
    await adminSupabase.rpc("get_current_login_streak", {
      p_user_id: data.user.id,
    });

  if (loginStreakError) {
    throw new Error(`Giriş serisi okunamadı: ${loginStreakError.message}`);
  }

  const completedWorldCount = data.worlds.filter(
    (world) => world.status === "completed",
  ).length;

  const selectedTitle = data.journey?.reward_title ?? "";

  const openedWorldThemes = data.worlds
    .filter((world) => world.status !== "locked")
    .map((world) => world.theme);

  const earnedBadgeKeys = data.badges.map((badge) => badge.badge_key);

  return (
    <ProfileClient
      initialUserName={data.profile?.username ?? "Kullanıcı"}
      initialEmail={data.user.email}
      initialAvatarId={data.profile?.avatar_id ?? "bunny"}
      totalXp={Number(data.journey?.total_xp ?? 0)}
      earnedBadgeKeys={earnedBadgeKeys}
      completedWorldCount={completedWorldCount}
      loginStreak={Number(loginStreak ?? 0)}
      earnedTitleCount={data.titles.length}
      selectedTitle={selectedTitle}
      openedWorldThemes={openedWorldThemes}
    />
  );
}

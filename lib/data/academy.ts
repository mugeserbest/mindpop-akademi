import "server-only";
import { createClient } from "../supabase/server";

export async function getAcademyData() {
  const supabase = await createClient();

  // Sisteme giriş yapan öğrenciyi bulur.
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  // Profil, aktif yolculuk ve kazanılmış unvanları aynı anda getirir.
  const [
    profileResult,
    journeyResult,
    titlesResult,
    badgesResult,
    onboardingResult,
  ] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, username, learning_goal, avatar_id")
        .eq("id", user.id)
        .maybeSingle(),

      supabase
        .from("learning_journeys")
        .select(
          "id, goal_prompt, goal_name, reward_title, status, current_world_position, total_xp, started_at",
        )
        .eq("user_id", user.id)
        .in("status", ["draft", "generating", "active"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),

      supabase
        .from("user_titles")
        .select("id, title_name, title_description, is_selected, earned_at")
        .eq("user_id", user.id)
        .order("earned_at", { ascending: true }),

      supabase
        .from("user_badges")
        .select("badge_key, earned_at")
        .eq("user_id", user.id)
        .order("earned_at", { ascending: true }),

      // Yarım bırakılan tanışma sohbeti dashboard'a dönüldüğünde devam eder.
      supabase
        .from("onboarding_sessions")
        .select("conversation_id, status")
        .eq("user_id", user.id)
        .in("status", ["collecting", "ready"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (profileResult.error) {
    throw new Error(`Profil okunamadı: ${profileResult.error.message}`);
  }

  if (journeyResult.error) {
    throw new Error(`Yolculuk okunamadı: ${journeyResult.error.message}`);
  }

  if (titlesResult.error) {
    throw new Error(`Unvanlar okunamadı: ${titlesResult.error.message}`);
  }

  if (badgesResult.error) {
    throw new Error(`Rozetler okunamadı: ${badgesResult.error.message}`);
  }

  if (onboardingResult.error) {
    throw new Error(
      `Yarım kalan POP görüşmesi okunamadı: ${onboardingResult.error.message}`,
    );
  }

  const journey = journeyResult.data;
  const onboardingSession = onboardingResult.data;

  // Kullanıcının henüz yolculuğu yoksa boş bilgi döndürür.
  if (!journey) {
    return {
      user: {
        id: user.id,
        email: user.email ?? "",
      },
      profile: profileResult.data,
      journey: null,
      worlds: [],
      currentWorld: null,
      tasks: [],
      quiz: null,
      titles: titlesResult.data ?? [],
      badges: badgesResult.data ?? [],
      onboardingSession,
    };
  }

  // Yolculuğun beş dünyasını getirir.
  const { data: worlds, error: worldsError } = await supabase
    .from("journey_worlds")
    .select(
      "id, world_number, name, description, theme, xp_required, xp_earned, quiz_pass_score, quiz_best_score, main_task_approved, pop_messages, status, content_status",
    )
    .eq("journey_id", journey.id)
    .order("world_number", { ascending: true });

  if (worldsError) {
    throw new Error(`Dünyalar okunamadı: ${worldsError.message}`);
  }

  const currentWorld =
    worlds?.find((world) => world.status === "active") ??
    worlds?.find(
      (world) => world.world_number === journey.current_world_position,
    ) ??
    null;

  // Yolculuk henüz yapay zekâ tarafından oluşturulmadıysa
  // dünya, görev ve quiz bulunmayabilir.
  if (!currentWorld) {
    return {
      user: {
        id: user.id,
        email: user.email ?? "",
      },
      profile: profileResult.data,
      journey,
      worlds: worlds ?? [],
      currentWorld: null,
      tasks: [],
      quiz: null,
      titles: titlesResult.data ?? [],
      badges: badgesResult.data ?? [],
      onboardingSession,
    };
  }

  const now = new Date().toISOString();

  // Aktif dünyanın güncel görevlerini ve quizini aynı anda getirir.
  const [tasksResult, quizResult] = await Promise.all([
    supabase
      .from("world_tasks")
      .select(
        `
      id,
      task_type,
      title,
      description,
      accepted_submission_types,
      submission_instructions,
      xp_reward,
      display_order,
      status,
      available_from,
      expires_at,
      completed_at,
      main_task_steps (
        id,
        label,
        description,
        display_order,
        completed
      ),
      main_task_submissions (
        id,
        status,
        submission_text,
        review_score,
        review_feedback,
        reviewed_at,
        created_at,
        main_task_submission_attachments (
          original_file_name
        )
      )
    `,
      )
      .eq("world_id", currentWorld.id)
      .in("status", ["active", "completed"])
      .lte("available_from", now)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order("display_order", { ascending: true }),

    supabase
      .from("world_quizzes")
      .select(
        `
  id,
  title,
  instructions,
  question_count,
questions_per_attempt,
time_limit_minutes,
  version
`,
      )
      .eq("world_id", currentWorld.id)
      .eq("status", "active")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (tasksResult.error) {
    throw new Error(`Görevler okunamadı: ${tasksResult.error.message}`);
  }

  if (quizResult.error) {
    throw new Error(`Quiz okunamadı: ${quizResult.error.message}`);
  }

  return {
    user: {
      id: user.id,
      email: user.email ?? "",
    },
    profile: profileResult.data,
    journey,
    worlds: worlds ?? [],
    currentWorld,
    tasks: tasksResult.data ?? [],
    quiz: quizResult.data,
    titles: titlesResult.data ?? [],
    badges: badgesResult.data ?? [],
    onboardingSession,
  };
}

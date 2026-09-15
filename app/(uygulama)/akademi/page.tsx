import { redirect } from "next/navigation";
import AcademyClient, {
  type AcademyWorld,
} from "../../../components/academy/AcademyClient";
import { getAcademyData } from "../../../lib/data/academy";

const worldImages: Record<string, string> = {
  forest: "/images/worlds/orman.png",
  village: "/images/worlds/koy.png",
  ocean: "/images/worlds/okyanus.png",
  volcano: "/images/worlds/volkan.png",
  kingdom: "/images/worlds/krallik.png",
};

const worldTypes: Record<string, AcademyWorld["type"]> = {
  forest: "orman",
  village: "koy",
  ocean: "okyanus",
  volcano: "volkan",
  kingdom: "krallik",
};

export default async function AkademiPage() {
  const data = await getAcademyData();

  if (!data) {
    redirect("/");
  }

  const dailyTasks = data.tasks
    .filter((task) => task.task_type === "daily")
    .map((task) => ({
      id: String(task.id),
      title: task.title,
      description: task.description ?? undefined,
      xp: Number(task.xp_reward),
      completed: task.status === "completed",
    }));

  const weeklyTasks = data.tasks
    .filter((task) => task.task_type === "weekly")
    .map((task) => ({
      id: String(task.id),
      title: task.title,
      description: task.description ?? undefined,
      xp: Number(task.xp_reward),
      completed: task.status === "completed",
    }));

  const mainTaskRow = data.tasks.find((task) => task.task_type === "main");

  const latestMainTaskSubmission = mainTaskRow
    ? ([...(mainTaskRow.main_task_submissions ?? [])].sort(
        (firstSubmission, secondSubmission) =>
          new Date(secondSubmission.created_at).getTime() -
          new Date(firstSubmission.created_at).getTime(),
      )[0] ?? null)
    : null;

  const mainTask = mainTaskRow
    ? {
        id: String(mainTaskRow.id),
        title: mainTaskRow.title,
        description:
          mainTaskRow.description ?? "Görev açıklaması henüz hazırlanmadı.",
        submissionTypes: mainTaskRow.accepted_submission_types ?? ["text"],
        submissionInstructions: mainTaskRow.submission_instructions ?? null,
        reviewStatus: latestMainTaskSubmission?.status ?? null,
        reviewScore: latestMainTaskSubmission?.review_score ?? null,
        reviewFeedback: latestMainTaskSubmission?.review_feedback ?? null,
        editableSubmissionText:
          latestMainTaskSubmission?.status === "rejected"
            ? (latestMainTaskSubmission.submission_text ?? "")
            : "",
        previousAttachmentNames:
          latestMainTaskSubmission?.status === "rejected"
            ? (latestMainTaskSubmission.main_task_submission_attachments ?? []).map(
                (attachment) => attachment.original_file_name,
              )
            : [],
        completed: mainTaskRow.status === "completed",
        steps: [...(mainTaskRow.main_task_steps ?? [])]
          .sort((firstStep, secondStep) => {
            return firstStep.display_order - secondStep.display_order;
          })
          .map((step) => ({
            id: String(step.id),
            label: step.label,
            description: step.description ?? undefined,
            completed: step.completed,
          })),
      }
    : null;

  const quiz = data.quiz
    ? {
        id: String(data.quiz.id),
        title: data.quiz.title,
        instructions: data.quiz.instructions ?? null,
        questionCount: Number(data.quiz.questions_per_attempt),
      }
    : null;

  const worlds = data.worlds.map(
    (world): AcademyWorld => ({
      level: Number(world.world_number),
      name: world.name,
      image: worldImages[world.theme] ?? worldImages.forest,
      status:
        world.status === "active"
          ? "current"
          : world.status === "completed"
            ? "unlocked"
            : "locked",
      type: worldTypes[world.theme] ?? "orman",
      currentXp: Number(world.xp_earned),
      xpGoal: Number(world.xp_required),
      quizScore: Number(world.quiz_best_score),
      quizPassScore: Number(world.quiz_pass_score),
      mainTaskApproved: world.main_task_approved,
    }),
  );

  return (
    <AcademyClient
      key={data.currentWorld ? String(data.currentWorld.id) : "no-active-world"}
      goalDescription={
        data.journey?.goal_name ??
        data.profile?.learning_goal ??
        "Öğrenme hedefin hazırlanıyor."
      }
      currentXp={Number(data.currentWorld?.xp_earned ?? 0)}
      xpGoal={Number(data.currentWorld?.xp_required ?? 0)}
      currentWorldId={data.currentWorld ? String(data.currentWorld.id) : null}
      worldContentStatus={
        data.currentWorld?.content_status === "pending" ||
        data.currentWorld?.content_status === "generating" ||
        data.currentWorld?.content_status === "failed"
          ? data.currentWorld.content_status
          : "ready"
      }
      initialDailyTasks={dailyTasks}
      initialWeeklyTasks={weeklyTasks}
      mainTask={mainTask}
      worlds={worlds}
      quiz={quiz}
    />
  );
}

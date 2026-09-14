type SelfReportTask = {
  title: string;
  description: string;
  xp_reward: number;
};

type MainTaskStep = {
  title: string;
  description: string;
};

type MainTask = {
  title: string;
  description: string;
  xp_reward: number;
  accepted_submission_types: string[];
  submission_instructions: string;
  evaluation_rubric: string[];
  steps: MainTaskStep[];
};

type QuizQuestion = {
  question_text: string;
  options: string[];
  correct_option: number;
  explanation: string;
};

type GeneratedWorld = {
  world_number: number;
  name: string;
  description: string;
  theme: "forest" | "village" | "ocean" | "volcano" | "kingdom";
  xp_required: number;
  quiz_pass_score: number;
  pop_messages: {
    start: string;
    halfway: string;
    xp_ready: string;
    main_task_approved: string;
  };
  daily_tasks: SelfReportTask[];
  weekly_tasks: SelfReportTask[];
  main_task: MainTask;
  quiz: {
    title: string;
    instructions: string;
    time_limit_minutes: number;
    questions: QuizQuestion[];
  };
};

export type GeneratedRoadmap = {
  goal_name: string;
  reward_title: string;
  worlds: GeneratedWorld[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isQuizPassScore(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 60 &&
    value <= 90
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isSelfReportTask(value: unknown): value is SelfReportTask {
  return (
    isRecord(value) &&
    typeof value.title === "string" &&
    typeof value.description === "string" &&
    isPositiveInteger(value.xp_reward)
  );
}

function isMainTaskStep(value: unknown): value is MainTaskStep {
  return (
    isRecord(value) &&
    typeof value.title === "string" &&
    typeof value.description === "string"
  );
}

function isQuizQuestion(value: unknown): value is QuizQuestion {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.question_text === "string" &&
    value.question_text.trim().length > 0 &&
    isStringArray(value.options) &&
    value.options.length === 4 &&
    value.options.every((option) => option.trim().length > 0) &&
    typeof value.correct_option === "number" &&
    Number.isInteger(value.correct_option) &&
    value.correct_option >= 0 &&
    value.correct_option < value.options.length &&
    typeof value.explanation === "string" &&
    value.explanation.trim().length > 0
  );
}

export function isRoadmap(value: unknown): value is GeneratedRoadmap {
  if (
    !isRecord(value) ||
    typeof value.goal_name !== "string" ||
    typeof value.reward_title !== "string" ||
    !Array.isArray(value.worlds) ||
    value.worlds.length !== 5
  ) {
    return false;
  }

  const expectedThemes = [
    "forest",
    "village",
    "ocean",
    "volcano",
    "kingdom",
  ] as const;

  let previousXp = 0;

  return value.worlds.every((world, index) => {
    if (
      !isRecord(world) ||
      world.world_number !== index + 1 ||
      world.theme !== expectedThemes[index] ||
      !isPositiveInteger(world.xp_required) ||
      world.xp_required <= previousXp ||
      typeof world.name !== "string" ||
      typeof world.description !== "string" ||
      !isQuizPassScore(world.quiz_pass_score) ||
      !Array.isArray(world.daily_tasks) ||
      world.daily_tasks.length !== 9 ||
      !world.daily_tasks.every(isSelfReportTask) ||
      !Array.isArray(world.weekly_tasks) ||
      world.weekly_tasks.length !== 9 ||
      !world.weekly_tasks.every(isSelfReportTask) ||
      !isRecord(world.pop_messages) ||
      !isRecord(world.main_task) ||
      !isRecord(world.quiz)
    ) {
      return false;
    }

    previousXp = world.xp_required;

    const mainTask = world.main_task;
    const quiz = world.quiz;

    return (
      typeof mainTask.title === "string" &&
      typeof mainTask.description === "string" &&
      isPositiveInteger(mainTask.xp_reward) &&
      isStringArray(mainTask.accepted_submission_types) &&
      typeof mainTask.submission_instructions === "string" &&
      isStringArray(mainTask.evaluation_rubric) &&
      Array.isArray(mainTask.steps) &&
      mainTask.steps.length >= 3 &&
      mainTask.steps.length <= 8 &&
      mainTask.steps.every(isMainTaskStep) &&
      typeof quiz.title === "string" &&
      typeof quiz.instructions === "string" &&
      isPositiveInteger(quiz.time_limit_minutes) &&
      Array.isArray(quiz.questions) &&
      quiz.questions.length === 15 &&
      quiz.questions.every(isQuizQuestion)
    );
  });
}

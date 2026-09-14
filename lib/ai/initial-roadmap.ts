type SelfReportTask = {
  title: string;
  description: string;
  xp_reward: number;
};

type MainTaskStep = {
  title: string;
  description: string;
};

type QuizQuestion = {
  question_text: string;
  options: string[];
  correct_option: number;
  explanation: string;
};

export type GeneratedWorldContent = {
  pop_messages: {
    start: string;
    halfway: string;
    xp_ready: string;
    main_task_approved: string;
  };
  daily_tasks: SelfReportTask[];
  weekly_tasks: SelfReportTask[];
  main_task: {
    title: string;
    description: string;
    xp_reward: number;
    accepted_submission_types: string[];
    submission_instructions: string;
    evaluation_rubric: string[];
    steps: MainTaskStep[];
  };
  quiz: {
    title: string;
    instructions: string;
    time_limit_minutes: number;
    questions: QuizQuestion[];
  };
};

export type GeneratedWorldOutline = {
  world_number: number;
  name: string;
  description: string;
  theme: "forest" | "village" | "ocean" | "volcano" | "kingdom";
  xp_required: number;
  quiz_pass_score: number;
};

export type InitialGeneratedRoadmap = {
  goal_name: string;
  reward_title: string;
  worlds: GeneratedWorldOutline[];
  first_world_content: GeneratedWorldContent;
};

const DEFINITIONS = {
  self_report_task: {
    type: "object",
    additionalProperties: false,
    required: ["title", "description", "xp_reward"],
    properties: {
      title: { type: "string", minLength: 2, maxLength: 160 },
      description: { type: "string", minLength: 2, maxLength: 2000 },
      xp_reward: { type: "integer", minimum: 1 },
    },
  },
  main_task_step: {
    type: "object",
    additionalProperties: false,
    required: ["title", "description"],
    properties: {
      title: { type: "string", minLength: 2, maxLength: 160 },
      description: { type: "string", minLength: 2, maxLength: 500 },
    },
  },
  main_task: {
    type: "object",
    additionalProperties: false,
    required: [
      "title",
      "description",
      "xp_reward",
      "accepted_submission_types",
      "submission_instructions",
      "evaluation_rubric",
      "steps",
    ],
    properties: {
      title: { type: "string", minLength: 2, maxLength: 160 },
      description: { type: "string", minLength: 2, maxLength: 2000 },
      xp_reward: { type: "integer", minimum: 1 },
      accepted_submission_types: {
        type: "array",
        minItems: 1,
        maxItems: 3,
        items: {
          type: "string",
          enum: ["text", "code", "url", "image", "audio", "video", "file"],
        },
      },
      submission_instructions: { type: "string", minLength: 2, maxLength: 2000 },
      evaluation_rubric: {
        type: "array",
        minItems: 3,
        maxItems: 6,
        items: { type: "string", minLength: 2, maxLength: 500 },
      },
      steps: {
        type: "array",
        minItems: 3,
        maxItems: 8,
        items: { $ref: "#/$defs/main_task_step" },
      },
    },
  },
  quiz_question: {
    type: "object",
    additionalProperties: false,
    required: ["question_text", "options", "correct_option", "explanation"],
    properties: {
      question_text: { type: "string", minLength: 5, maxLength: 1000 },
      options: {
        type: "array",
        minItems: 4,
        maxItems: 4,
        items: { type: "string", minLength: 1, maxLength: 500 },
      },
      correct_option: { type: "integer", minimum: 0, maximum: 3 },
      explanation: { type: "string", minLength: 2, maxLength: 2000 },
    },
  },
  quiz: {
    type: "object",
    additionalProperties: false,
    required: ["title", "instructions", "time_limit_minutes", "questions"],
    properties: {
      title: { type: "string", minLength: 2, maxLength: 160 },
      instructions: { type: "string", minLength: 2, maxLength: 2000 },
      time_limit_minutes: { type: "integer", minimum: 1, maximum: 180 },
      questions: {
        type: "array",
        minItems: 15,
        maxItems: 15,
        items: { $ref: "#/$defs/quiz_question" },
      },
    },
  },
  pop_messages: {
    type: "object",
    additionalProperties: false,
    required: ["start", "halfway", "xp_ready", "main_task_approved"],
    properties: {
      start: { type: "string", minLength: 2, maxLength: 500 },
      halfway: { type: "string", minLength: 2, maxLength: 500 },
      xp_ready: { type: "string", minLength: 2, maxLength: 500 },
      main_task_approved: { type: "string", minLength: 2, maxLength: 500 },
    },
  },
  world_content: {
    type: "object",
    additionalProperties: false,
    required: ["pop_messages", "daily_tasks", "weekly_tasks", "main_task", "quiz"],
    properties: {
      pop_messages: { $ref: "#/$defs/pop_messages" },
      daily_tasks: {
        type: "array",
        minItems: 9,
        maxItems: 9,
        items: { $ref: "#/$defs/self_report_task" },
      },
      weekly_tasks: {
        type: "array",
        minItems: 9,
        maxItems: 9,
        items: { $ref: "#/$defs/self_report_task" },
      },
      main_task: { $ref: "#/$defs/main_task" },
      quiz: { $ref: "#/$defs/quiz" },
    },
  },
};

const OUTLINE_DEFINITION = {
  type: "object",
  additionalProperties: false,
  required: ["world_number", "name", "description", "theme", "xp_required", "quiz_pass_score"],
  properties: {
    world_number: { type: "integer", minimum: 1, maximum: 5 },
    name: { type: "string", minLength: 2, maxLength: 100 },
    description: { type: "string", minLength: 2, maxLength: 1000 },
    theme: { type: "string", enum: ["forest", "village", "ocean", "volcano", "kingdom"] },
    xp_required: { type: "integer", minimum: 1 },
    quiz_pass_score: { type: "integer", minimum: 60, maximum: 90 },
  },
};

export const INITIAL_ROADMAP_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["goal_name", "reward_title", "worlds", "first_world_content"],
  properties: {
    goal_name: { type: "string", minLength: 3, maxLength: 200 },
    reward_title: { type: "string", minLength: 2, maxLength: 100 },
    worlds: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: { $ref: "#/$defs/world_outline" },
    },
    first_world_content: { $ref: "#/$defs/world_content" },
  },
  $defs: { ...DEFINITIONS, world_outline: OUTLINE_DEFINITION },
};

export const WORLD_CONTENT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["content"],
  properties: {
    content: { $ref: "#/$defs/world_content" },
  },
  $defs: DEFINITIONS,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isTask(value: unknown): value is SelfReportTask {
  return isRecord(value) && isText(value.title) && isText(value.description) && isPositiveInteger(value.xp_reward);
}

function isQuestion(value: unknown): value is QuizQuestion {
  return isRecord(value) && isText(value.question_text) && Array.isArray(value.options) && value.options.length === 4 && value.options.every(isText) && typeof value.correct_option === "number" && Number.isInteger(value.correct_option) && value.correct_option >= 0 && value.correct_option <= 3 && isText(value.explanation);
}

export function isGeneratedWorldContent(value: unknown): value is GeneratedWorldContent {
  if (!isRecord(value)) return false;
  const popMessages = value.pop_messages;
  if (!isRecord(popMessages) || !["start", "halfway", "xp_ready", "main_task_approved"].every((key) => isText(popMessages[key])) || !Array.isArray(value.daily_tasks) || value.daily_tasks.length !== 9 || !value.daily_tasks.every(isTask) || !Array.isArray(value.weekly_tasks) || value.weekly_tasks.length !== 9 || !value.weekly_tasks.every(isTask) || !isRecord(value.main_task) || !isRecord(value.quiz)) return false;
  const mainTask = value.main_task;
  const quiz = value.quiz;
  return isText(mainTask.title) && isText(mainTask.description) && isPositiveInteger(mainTask.xp_reward) && Array.isArray(mainTask.accepted_submission_types) && mainTask.accepted_submission_types.length > 0 && mainTask.accepted_submission_types.every(isText) && isText(mainTask.submission_instructions) && Array.isArray(mainTask.evaluation_rubric) && mainTask.evaluation_rubric.length >= 3 && mainTask.evaluation_rubric.every(isText) && Array.isArray(mainTask.steps) && mainTask.steps.length >= 3 && mainTask.steps.length <= 8 && mainTask.steps.every((step) => isRecord(step) && isText(step.title) && isText(step.description)) && isText(quiz.title) && isText(quiz.instructions) && isPositiveInteger(quiz.time_limit_minutes) && Array.isArray(quiz.questions) && quiz.questions.length === 15 && quiz.questions.every(isQuestion);
}

export function isInitialGeneratedRoadmap(value: unknown): value is InitialGeneratedRoadmap {
  if (!isRecord(value) || !isText(value.goal_name) || !isText(value.reward_title) || !Array.isArray(value.worlds) || value.worlds.length !== 5 || !isGeneratedWorldContent(value.first_world_content)) return false;
  const themes = ["forest", "village", "ocean", "volcano", "kingdom"];
  let previousXp = 0;
  return value.worlds.every((world, index) => {
    if (!isRecord(world) || world.world_number !== index + 1 || world.theme !== themes[index] || !isText(world.name) || !isText(world.description) || !isPositiveInteger(world.xp_required) || world.xp_required <= previousXp || typeof world.quiz_pass_score !== "number" || !Number.isInteger(world.quiz_pass_score) || world.quiz_pass_score < 60 || world.quiz_pass_score > 90) return false;
    previousXp = world.xp_required;
    return true;
  });
}

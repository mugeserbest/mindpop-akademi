import "server-only";

export const ROADMAP_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["goal_name", "reward_title", "worlds"],
  properties: {
    goal_name: {
      type: "string",
      minLength: 3,
      maxLength: 200,
    },
    reward_title: {
      type: "string",
      minLength: 2,
      maxLength: 100,
    },
    worlds: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: { $ref: "#/$defs/world" },
    },
  },
  $defs: {
    self_report_task: {
      type: "object",
      additionalProperties: false,
      required: ["title", "description", "xp_reward"],
      properties: {
        title: {
          type: "string",
          minLength: 2,
          maxLength: 160,
        },
        description: {
          type: "string",
          minLength: 2,
          maxLength: 2000,
        },
        xp_reward: {
          type: "integer",
          minimum: 1,
        },
      },
    },

    main_task_step: {
      type: "object",
      additionalProperties: false,
      required: ["title", "description"],
      properties: {
        title: {
          type: "string",
          minLength: 2,
          maxLength: 160,
        },
        description: {
          type: "string",
          minLength: 2,
          maxLength: 500,
        },
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
        title: {
          type: "string",
          minLength: 2,
          maxLength: 160,
        },
        description: {
          type: "string",
          minLength: 2,
          maxLength: 2000,
        },
        xp_reward: {
          type: "integer",
          minimum: 1,
        },
        accepted_submission_types: {
          type: "array",
          minItems: 1,
          maxItems: 3,
          items: {
            type: "string",
            enum: ["text", "code", "url", "image", "audio", "video", "file"],
          },
        },
        submission_instructions: {
          type: "string",
          minLength: 2,
          maxLength: 2000,
        },
        evaluation_rubric: {
          type: "array",
          minItems: 3,
          maxItems: 6,
          items: {
            type: "string",
            minLength: 2,
            maxLength: 500,
          },
        },
        steps: {
          type: "array",
          minItems: 3,
          maxItems: 8,
          items: {
            $ref: "#/$defs/main_task_step",
          },
        },
      },
    },
    quiz_question: {
      type: "object",
      additionalProperties: false,
      required: ["question_text", "options", "correct_option", "explanation"],
      properties: {
        question_text: {
          type: "string",
          minLength: 5,
          maxLength: 1000,
        },
        options: {
          type: "array",
          minItems: 4,
          maxItems: 4,
          items: {
            type: "string",
            minLength: 1,
            maxLength: 500,
          },
        },
        correct_option: {
          type: "integer",
          minimum: 0,
          maximum: 3,
        },
        explanation: {
          type: "string",
          minLength: 2,
          maxLength: 2000,
        },
      },
    },
    quiz: {
      type: "object",
      additionalProperties: false,
      required: ["title", "instructions", "time_limit_minutes", "questions"],
      properties: {
        title: {
          type: "string",
          minLength: 2,
          maxLength: 160,
        },
        instructions: {
          type: "string",
          minLength: 2,
          maxLength: 2000,
        },
        time_limit_minutes: {
          type: "integer",
          minimum: 1,
          maximum: 180,
        },
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
        main_task_approved: {
          type: "string",
          minLength: 2,
          maxLength: 500,
        },
      },
    },
    world: {
      type: "object",
      additionalProperties: false,
      required: [
        "world_number",
        "name",
        "description",
        "theme",
        "xp_required",
        "quiz_pass_score",
        "pop_messages",
        "main_task",
        "quiz",
        "daily_tasks",
        "weekly_tasks",
      ],
      properties: {
        world_number: {
          type: "integer",
          minimum: 1,
          maximum: 5,
        },
        name: {
          type: "string",
          minLength: 2,
          maxLength: 100,
        },
        description: {
          type: "string",
          minLength: 2,
          maxLength: 1000,
        },
        theme: {
          type: "string",
          enum: ["forest", "village", "ocean", "volcano", "kingdom"],
        },
        xp_required: {
          type: "integer",
          minimum: 1,
        },
        quiz_pass_score: {
          type: "integer",
          minimum: 0,
          maximum: 100,
        },
        pop_messages: {
          $ref: "#/$defs/pop_messages",
        },
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

        main_task: {
          $ref: "#/$defs/main_task",
        },
        quiz: {
          $ref: "#/$defs/quiz",
        },
      },
    },
  },
};

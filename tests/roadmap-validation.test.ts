import { describe, expect, it } from "vitest";
import {
  isGeneratedWorldContent,
  isInitialGeneratedRoadmap,
  type InitialGeneratedRoadmap,
} from "../lib/ai/initial-roadmap";

const themes = ["forest", "village", "ocean", "volcano", "kingdom"] as const;

function createWorldContent() {
  return {
    pop_messages: {
      start: "Başlayalım.",
      halfway: "Yarıya geldin.",
      xp_ready: "XP hedefin tamam.",
      main_task_approved: "Ana görevin onaylandı.",
    },
    daily_tasks: Array.from({ length: 9 }, (_, index) => ({
      title: `Günlük görev ${index + 1}`,
      description: "Kısa, somut ve ölçülebilir bir çalışma yap.",
      xp_reward: 20,
    })),
    weekly_tasks: Array.from({ length: 9 }, (_, index) => ({
      title: `Haftalık görev ${index + 1}`,
      description: "Hafta içinde tamamlanabilecek somut çalışma.",
      xp_reward: 60,
    })),
    main_task: {
      title: "Küçük proje oluştur",
      description: "Öğrendiklerini gösteren küçük bir çalışma hazırla.",
      xp_reward: 300,
      accepted_submission_types: ["text"],
      submission_instructions: "Çalışmanı metin olarak gönder.",
      evaluation_rubric: ["Konuyu uygular.", "Açıklaması anlaşılır.", "Teslim tamamdır."],
      steps: Array.from({ length: 3 }, (_, index) => ({
        title: `Adım ${index + 1}`,
        description: "Ana görevin bir parçasını tamamla.",
      })),
    },
    quiz: {
      title: "Dünya mini quiz",
      instructions: "Her soruyu dikkatle cevapla.",
      time_limit_minutes: 10,
      questions: Array.from({ length: 15 }, (_, index) => ({
        question_text: `Soru ${index + 1}`,
        options: ["A", "B", "C", "D"],
        correct_option: 0,
        explanation: "A seçeneği doğrudur.",
      })),
    },
  };
}

function createValidRoadmap(): InitialGeneratedRoadmap {
  return {
    goal_name: "Başlangıçtan Web Geliştirme Yolculuğu",
    reward_title: "Web Macerası Ustası",
    worlds: themes.map((theme, index) => ({
      world_number: index + 1,
      name: `${index + 1}. Dünya`,
      description: "Ölçülebilir ve seviyeye uygun öğrenme alanı.",
      theme,
      xp_required: (index + 1) * 500,
      quiz_pass_score: 60,
    })),
    first_world_content: createWorldContent(),
  };
}

describe("aşamalı yol haritası doğrulaması", () => {
  it("beş dünya planı ve ilk dünya içeriğini kabul eder", () => {
    expect(isInitialGeneratedRoadmap(createValidRoadmap())).toBe(true);
  });

  it("on beşten az quiz sorusu olan dünya içeriğini reddeder", () => {
    const content = createWorldContent();
    content.quiz.questions.pop();

    expect(isGeneratedWorldContent(content)).toBe(false);
  });

  it("dört seçenekli olmayan quiz sorusunu reddeder", () => {
    const content = createWorldContent();
    content.quiz.questions[0].options = ["A", "B", "C"];

    expect(isGeneratedWorldContent(content)).toBe(false);
  });
});

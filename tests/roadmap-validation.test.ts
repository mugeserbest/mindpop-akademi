import { describe, expect, it } from "vitest";
import {
  isRoadmap,
  type GeneratedRoadmap,
} from "../lib/ai/roadmap-validation";

const themes = [
  "forest",
  "village",
  "ocean",
  "volcano",
  "kingdom",
] as const;

function createValidRoadmap(): GeneratedRoadmap {
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
      pop_messages: {
        start: "Başlayalım.",
        halfway: "Yarıya geldin.",
        xp_ready: "XP hedefin tamam.",
        main_task_approved: "Ana görevin onaylandı.",
      },
      daily_tasks: Array.from({ length: 9 }, (_, taskIndex) => ({
        title: `Günlük görev ${taskIndex + 1}`,
        description: "Kısa, somut ve ölçülebilir bir çalışma yap.",
        xp_reward: 20,
      })),
      weekly_tasks: Array.from({ length: 9 }, (_, taskIndex) => ({
        title: `Haftalık görev ${taskIndex + 1}`,
        description: "Hafta içinde tamamlanabilecek somut çalışma.",
        xp_reward: 60,
      })),
      main_task: {
        title: "Küçük proje oluştur",
        description: "Öğrendiklerini gösteren küçük bir çalışma hazırla.",
        xp_reward: 300,
        accepted_submission_types: ["text"],
        submission_instructions: "Çalışmanı metin olarak gönder.",
        evaluation_rubric: ["İstenen konuyu uygular."],
        steps: Array.from({ length: 3 }, (_, stepIndex) => ({
          title: `Adım ${stepIndex + 1}`,
          description: "Ana görevin bir parçasını tamamla.",
        })),
      },
      quiz: {
        title: "Dünya mini quiz",
        instructions: "Her soruyu dikkatle cevapla.",
        time_limit_minutes: 10,
        questions: Array.from({ length: 15 }, (_, questionIndex) => ({
          question_text: `Soru ${questionIndex + 1}`,
          options: ["A", "B", "C", "D"],
          correct_option: 0,
          explanation: "A seçeneği doğrudur.",
        })),
      },
    })),
  };
}

describe("isRoadmap", () => {
  it("beş dünya, dokuz görev ve on beş soruluk geçerli yol haritasını kabul eder", () => {
    expect(isRoadmap(createValidRoadmap())).toBe(true);
  });

  it("on beşten az quiz sorusu olan yol haritasını reddeder", () => {
    const roadmap = createValidRoadmap();
    roadmap.worlds[0].quiz.questions.pop();

    expect(isRoadmap(roadmap)).toBe(false);
  });

  it("dört seçenekli olmayan quiz sorusunu reddeder", () => {
    const roadmap = createValidRoadmap();
    roadmap.worlds[0].quiz.questions[0].options = ["A", "B", "C"];

    expect(isRoadmap(roadmap)).toBe(false);
  });
});

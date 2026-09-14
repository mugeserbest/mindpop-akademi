import "server-only";
import { openai } from "@/lib/ai/openai";
import {
  isGeneratedWorldContent,
  WORLD_CONTENT_JSON_SCHEMA,
  type GeneratedWorldContent,
  type GeneratedWorldOutline,
} from "@/lib/ai/initial-roadmap";
import { POP_CORE_RULES } from "@/lib/ai/pop-rules";

type GenerateWorldContentInput = {
  goalPrompt: string;
  goalName: string;
  world: GeneratedWorldOutline;
};

export async function generateWorldContent({
  goalPrompt,
  goalName,
  world,
}: GenerateWorldContentInput): Promise<GeneratedWorldContent> {
  const response = await openai.responses.create({
    model: "gpt-5.6-luna",
    reasoning: { effort: "none" },
    max_output_tokens: 11000,
    instructions: `
${POP_CORE_RULES}

Aktif öğrenme dünyası için içerik oluşturuyorsun.
- Kullanıcının hedefi, yolculuk adı ve aşağıdaki dünya bilgisi dışına çıkma.
- Dokuz günlük ve dokuz haftalık görev üret. Görevler üçlü döngülerle gösterilir;
  bu yüzden her görev somut, ölçülebilir ve birbirinden farklı olsun.
- Açıklamalarda yapılacak iş, yaklaşık süre ve beklenen sonuç yer alsın.
- Gerçekçi bir ana görev, 3-8 açıklamalı adım, teslim yönergesi ve 3-6 değerlendirme
  ölçütü üret.
- Bu dünya için tam 15 soruluk, 4 seçenekli, tek doğru cevaplı quiz havuzu üret.
- POP mesajlarını kullanıcının bu dünyadaki ilerlemesine göre yaz.
- Metinler Türkçe olsun; öğrenme içeriği hedef dil gerektiriyorsa o dil kullanılabilir.
- Yalnızca istenen JSON biçiminde cevap ver.
      `,
    input: `Öğrenme hedefi: ${goalPrompt}\nYolculuk adı: ${goalName}\nAktif dünya: ${JSON.stringify(world)}`,
    text: {
      format: {
        type: "json_schema",
        name: "mindpop_world_content",
        strict: true,
        schema: WORLD_CONTENT_JSON_SCHEMA,
      },
    },
  });

  let parsed: unknown;

  try {
    parsed = JSON.parse(response.output_text);
  } catch {
    throw new Error("AI dünya içeriğini okunabilir biçimde üretmedi.");
  }

  if (!parsed || typeof parsed !== "object" || !("content" in parsed)) {
    throw new Error("AI dünya içeriğini beklenen biçimde üretmedi.");
  }

  const content = (parsed as { content: unknown }).content;

  if (!isGeneratedWorldContent(content)) {
    throw new Error("AI dünya içeriği uygulama kurallarını karşılamıyor.");
  }

  return content;
}

import "server-only";
import { openai } from "@/lib/ai/openai";
import {
  INITIAL_ROADMAP_JSON_SCHEMA,
  isInitialGeneratedRoadmap,
  type InitialGeneratedRoadmap,
} from "@/lib/ai/initial-roadmap";
import { POP_CORE_RULES } from "@/lib/ai/pop-rules";

export async function generateRoadmap(
  goalPrompt: string,
): Promise<InitialGeneratedRoadmap> {
  const response = await openai.responses.create({
    model: "gpt-5.6-luna",
    reasoning: { effort: "none" },
    // İlk dünya için çok sayıda görev ve quiz sorusu gerekiyor. Yanıtın kısa
    // tutulması, Netlify'nin eşzamanlı istek süresine güvenle sığması için
    // önemlidir; şema yine tüm gerekli içeriği zorunlu kılar.
    max_output_tokens: 6500,
    instructions: `
${POP_CORE_RULES}

Bir kullanıcının öğrenme yolculuğunun başlangıcını oluşturuyorsun.

ÇIKTI YAPISI
- Tam olarak beş dünyalık bir yolculuk tasarla.
- worlds alanına sadece her dünyanın kısa planını koy: dünya numarası, hedefe
  özel adı, kısa açıklaması, sabit tema, gerekli XP ve quiz geçme puanı.
- Sabit tema ve sıra değişmez: forest, village, ocean, volcano, kingdom.
- first_world_content alanına yalnızca 1. dünyanın günlük/haftalık görevlerini,
  ana görevini, POP mesajlarını ve 15 soruluk quiz havuzunu koy.
- 2-5. dünyaların ayrıntılı görevleri ve quizleri daha sonra kullanıcı o dünyaya
  geçtiğinde hazırlanacak; onlar için içerik üretme.

KALİTE KURALLARI
- goal_name tek kelime olmasın; hedefi anlatan, kısa ve havalı bir macera adı olsun.
- reward_title hedefe özel bir unvan olsun.
- Dünya isimleri sabit temayla ve hedefle anlamlı biçimde ilişkilensin.
- Her sonraki dünyanın xp_required değeri öncekinden yüksek olsun.
- quiz_pass_score bir yüzdedir; 60-90 arasında tam sayı olmalı.
- Birinci dünyadaki 9 günlük ve 9 haftalık görev ölçülebilir, açıklayıcı ve
  başlangıç seviyesine uygun olsun. Üçlü gruplar gün/hafta döngüsüyle kullanılır.
- Haftalık görev başlıkları yalnızca yapılacak eylemi anlatsın. Başlıkta “1. Hafta”,
  “Hafta 2”, gün/hafta numarası veya döngü etiketi kullanma; örneğin “Temel
  selamlaşma diyaloğu kur” gibi somut bir ad yaz.
- Görev açıklaması yapılacak işi, yaklaşık süreyi ve beklenen sonucu söylesin.
- Ana görev gerçekçi biçimde teslim edilip değerlendirilebilsin; uygun teslim
  türlerini, ölçütleri ve 3-5 açıklamalı adımı ekle.
- Quiz soruları 4 seçenekli, tek doğru cevaplı ve öğretici açıklamalı olsun.
- Metinleri Türkçe yaz; öğrenme içeriği hedef dil gerektiriyorsa o dil kullanılabilir.
- Yanıtı kısa ve yoğun tut: görev açıklamaları tek kısa cümle, POP mesajları
  tek kısa cümle, ana görev yönergesi en fazla üç kısa cümle olsun. Quiz sorusu,
  seçenekleri ve açıklaması da gereksiz tekrar içermesin.
- Yalnızca istenen JSON biçiminde cevap ver.
      `,
    input: `Kullanıcının öğrenme hedefi: ${goalPrompt}`,
    text: {
      format: {
        type: "json_schema",
        name: "mindpop_initial_learning_roadmap",
        strict: true,
        schema: INITIAL_ROADMAP_JSON_SCHEMA,
      },
    },
  });

  let parsedRoadmap: unknown;

  try {
    parsedRoadmap = JSON.parse(response.output_text);
  } catch {
    throw new Error("AI yol haritasını okunabilir biçimde üretmedi.");
  }

  if (!isInitialGeneratedRoadmap(parsedRoadmap)) {
    throw new Error("AI yol haritası uygulama kurallarını karşılamıyor.");
  }

  return parsedRoadmap;
}

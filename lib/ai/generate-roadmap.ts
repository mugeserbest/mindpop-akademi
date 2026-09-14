import "server-only";
import { openai } from "@/lib/ai/openai";
import { POP_CORE_RULES } from "@/lib/ai/pop-rules";
import { ROADMAP_JSON_SCHEMA } from "@/lib/ai/roadmap-schema";
import {
  isRoadmap,
  type GeneratedRoadmap,
} from "@/lib/ai/roadmap-validation";

export async function generateRoadmap(
  goalPrompt: string,
): Promise<GeneratedRoadmap> {
  const response = await openai.responses.create({
    model: "gpt-5.6-luna",
    reasoning: {
      effort: "low",
    },
    max_output_tokens: 24000,
    instructions: `
${POP_CORE_RULES}

Şimdi bir kullanıcının öğrenme yol haritasını oluşturuyorsun.

YOL HARİTASI KURALLARI
- Tam olarak 5 dünya oluştur.
- Dünya temaları ve sırası değişmez:
  1. forest, 2. village, 3. ocean, 4. volcano, 5. kingdom.
- Dünya isimleri kullanıcının hedefiyle anlamlı biçimde ilişkilendirilsin.
- goal_name asla yalnızca "Tenis", "İngilizce" veya "Kodlama" gibi tek kelime
  olmasın. Hedefi açıkça anlatan, kısa ve havalı bir macera adı üret.
  Örnek: "Kortta İlk Servisten Güçlü Rallilere", "Sıfırdan Akıcı İngilizce Yolculuğu".
- reward_title da hedefe özel bir unvan olsun. Genel "Uzman" veya "Öğrenci"
  kullanma.
- Her dünya adı, sabit temasıyla birlikte hedefe özgü bir isim taşısın.
  Örnek tenis için "Servis Ormanı", "Ralli Köyü"; kodlama için "Mantık Ormanı".
- Günlük ve haftalık görev başlıkları, yapılacak işi ve ölçülebilir hedefi
  doğrudan söylemeli. "Pratik yap" veya "Tenis çalış" gibi belirsiz başlıklar
  kullanma.
- Görev açıklamasında kullanıcının ne yapacağını, yaklaşık ne kadar süreceğini
  ve beklenen sonucu açıkça yaz.
  Örnek başlık: "10 dakikada 20 forehand gölge vuruşu yap"
  Örnek açıklama: "Raketin yoksa boş elle yap. Aynada yan duruşunu koruyup
  20 kontrollü forehand hareketi tamamla."
- Her yeni dünyanın xp_required değeri bir öncekinden yüksek olsun.
- Ana görevler dünyalar ilerledikçe gerçekçi biçimde zorlaşsın.
- Ana görev, yalnızca kullanıcının gerçekten üretebileceği bir çalışma ile
  değerlendirilebilmeli. Uygun teslim türünü seç.
- quiz_pass_score bir yüzde puanıdır; soru sayısı veya doğru cevap sayısı değildir.
  Her dünya için 60 ile 90 arasında tam sayı bir geçme puanı belirle. Örnek: 60, 65,
  70, 75, 80. Dünya ilerledikçe bu puan aynı kalabilir veya artabilir; asla 5, 10,
  15 gibi soru adedini çağrıştıran değerler kullanma.
- Ses yalnızca konuşma, telaffuz ya da sözlü sunum kanıtı gerekiyorsa kabul edilen
  teslim türü olsun. Video ise konuşma, hareket veya görsel süreç kanıtı gerektiğinde
  seçilebilir. POP videonun ses dökümünü ve en fazla dört temsilî görüntü karesini
  inceleyebilir; videonun tümünü izleyemez. Bu nedenle kesintisiz hareket, ayrıntılı
  ses kalitesi veya videoda görünmeyen bir adım hakkında kesin kanıt gerektiren görev
  tasarlama. Tek bir görsel yeterliyse video yerine image, file veya text kullan.
- Her dünya için 15 soruluk bir quiz soru havuzu oluştur.
- Her soru 4 seçenekli, tek doğru cevaplı ve seviyeye uygun olsun.
- Kullanıcı her quiz denemesinde bu havuzdan rastgele 5 soru görür.
- Quiz doğru cevap açıklamaları öğretici olsun.
- Quiz doğru cevap açıklamaları öğretici olsun.
- Her dünya için tam 9 günlük ve 9 haftalık görev oluştur.
- Günlük görevler 1-3, 4-6, 7-9 gruplarıyla her gün üçer görev gösterilecek.
  Dokuzuncu görev grubundan sonra tekrar 1-3 grubuna dönülecek.
- Haftalık görevler de aynı mantıkla, her hafta üçer görev gösterilecek.
- Aynı haftada gösterilecek 1-3 numaralı haftalık görevler, o haftanın içinde
  tamamlanabilecek üç farklı görev olmalı; bunları "1. hafta", "2. hafta"
  gibi adlandırma.
- 4-6 numaralı görevler bir sonraki haftanın, 7-9 numaralı görevler de
  sonraki haftanın üçlü grubudur.
- Haftalık görev başlığında hafta numarası değil, yapılacak somut iş ve
  ölçülebilir hedef yazmalı.
  Örnek: "Hafta boyunca 15 yeni kelimeyi üç kısa cümlede kullan"
  veya "İki gün 20 dakikalık kod tekrar seansı yap".
- Bu görevler AI tarafından tekrar üretilmeyecek; dünya tamamlanana kadar
  şablon havuzundan döngüyle kullanılacak.
- Günlük/haftlık görevler kullanıcının kendi bildirimine dayanır; bunlar için
  teslim türü veya POP onayı isteme.
- Metinleri çoğunlukla Türkçe yaz. Ancak öğrenme içeriği hedef dilde olmalıysa
  (örneğin İngilizce örnek cümleler) o dil kullanılabilir.
- Sadece istenen JSON biçiminde cevap ver.
      `,
    input: `Kullanıcının öğrenme hedefi: ${goalPrompt}`,
    text: {
      format: {
        type: "json_schema",
        name: "mindpop_learning_roadmap",
        strict: true,
        schema: ROADMAP_JSON_SCHEMA,
      },
    },
  });

  let parsedRoadmap: unknown;

  try {
    parsedRoadmap = JSON.parse(response.output_text);
  } catch {
    throw new Error("AI yol haritasını okunabilir biçimde üretmedi.");
  }

  if (!isRoadmap(parsedRoadmap)) {
    throw new Error("AI yol haritası uygulama kurallarını karşılamıyor.");
  }

  return parsedRoadmap;
}

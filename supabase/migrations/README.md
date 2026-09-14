# Mindpop Akademi migration planı

Bu klasör, Supabase veritabanı yapısının sürüm geçmişini tutar. Her `.sql`
dosyası, veritabanında yapılmış bir değişikliğin yeniden uygulanabilir kaydıdır.

## Önemli kural

Mevcut Supabase projesinde tablolar ve fonksiyonlar zaten var. Bu nedenle
başlangıç şemasını buraya eklemek, mevcut projeye tekrar çalıştırmak anlamına
gelmez. Bu dosyalar yeni bir Supabase projesini aynı yapıyla kurmak ve bundan
sonraki değişiklikleri takip etmek içindir.

## İlk aktarım sırası

Kaydedilmiş SQL Editor sorgularını, aşağıdaki sırayı koruyarak buraya aktaracağız:

1. `*_base_schema.sql` — `profiles`, `learning_journeys`, `journey_worlds`,
   `world_tasks` ve ortak `updated_at` tetikleyicileri.
2. `*_xp_titles_badges.sql` — XP makbuzları, unvanlar, rozetler, avatarlar ve
   giriş serisi kayıtları.
3. `*_task_cycles.sql` — günlük/haftalık görev döngüleri ve tamamlanma
   fonksiyonları.
4. `*_quiz_system.sql` — quizler, soru havuzu, denemeler ve puan hesaplama
   fonksiyonları.
5. `*_main_task_submissions.sql` — ana görev adımları, teslimler, dosya
   ekleri, POP onay/red fonksiyonları ve dünya geçişi.
6. `*_pop_and_onboarding.sql` — POP konuşmaları, mesajlar ve başlangıç
   görüşmesi oturumları.
7. `*_ai_journey_generation.sql` — yapay zekânın yolculuk oluşturma
   fonksiyonu ile üretim kilidi.
8. `*_rls_policies.sql` — RLS politikaları ve Storage bucket/politikaları.

## Mevcut canlı proje için sonraki adım

Mevcut Supabase projesinde başlangıç şeması zaten bulunduğu için yalnızca
yeni değişiklik migration'ları çalıştırılır. Yayınlamadan önce çalıştırılması
gereken dosya:

- `20260912100000_add_ai_usage_limits.sql` — POP mesajı, başlangıç görüşmesi,
  yol haritası üretimi ve ana görev değerlendirmesi için kullanıcı başına
  günlük kota uygular.

Bu dosya Supabase SQL Editor'da bir kez çalıştırılır. Başarılı olduktan sonra
AI istekleri Türkiye saatine göre her gün yeniden sayılır.

## Bundan sonra

- Önce bir değişikliğin SQL dosyasını oluştururuz.
- Sonra aynı SQL'i Supabase SQL Editor'da çalıştırırız.
- Dosya adı tarih/saat ile başlar: `20260911153000_add_example.sql`.
- Mevcut tabloları silen veya veriyi sıfırlayan SQL yazmayız.

# Mindpop Akademi

Mindpop Akademi, kullanıcıların seçtikleri beceri için yapay zekâ destekli ve oyunlaştırılmış öğrenme yol haritaları oluşturabildiği bir web uygulamasıdır.

Kullanıcı; hedefini, mevcut seviyesini ve koşullarını POP adlı rehber asistanla konuşarak netleştirir. Ardından sistem beş dünyadan oluşan kişisel bir yolculuk, görevler, ana görevler ve soru havuzlu quizler oluşturur.

> Bu proje aktif geliştirme aşamasındaki bir portföy/beta projesidir.

## Öne çıkan özellikler

- Supabase Auth ile kayıt, giriş, e-posta doğrulama ve şifre sıfırlama
- Aynı anda yalnızca bir aktif öğrenme yolculuğu
- Beş aşamalı dünya yapısı: Orman, Köy, Okyanus, Volkan ve Krallık
- Günlük, haftalık ve POP onaylı ana görevler
- XP, seviye geçişi, unvan, rozet, avatar ve giriş serisi sistemi
- Her denemede soru havuzundan rastgele seçilen quiz soruları
- Cevap sonrası doğru cevap ve açıklama gösterimi
- Metin, görsel, PDF ve kod dosyalarıyla ana görev teslimi
- OpenAI destekli POP sohbeti, yol haritası üretimi ve ana görev değerlendirmesi
- Kullanıcı verilerini ayıran Row Level Security (RLS) kuralları
- Kullanıcı bazlı günlük yapay zekâ kullanım limitleri

## Teknolojiler

- Next.js 16, React 19 ve TypeScript
- Tailwind CSS
- Supabase: Auth, PostgreSQL, RLS ve Storage
- OpenAI Responses API
- Vitest

## Yerelde çalıştırma

1. Bağımlılıkları yükle:

   ```bash
   npm install
   ```

2. `.env.example` dosyasını `.env.local` olarak kopyala ve kendi değerlerini gir.

3. Supabase SQL Editor'da gerekli migration'ları uygula. Mevcut bir veritabanında yalnızca yeni migration'lar çalıştırılmalıdır; başlangıç şemasını ikinci kez çalıştırma.

4. Geliştirme sunucusunu başlat:

   ```bash
   npm run dev
   ```

## Ortam değişkenleri

| Değişken | Açıklama |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase proje URL'si |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Tarayıcıda kullanılabilen Supabase anahtarı |
| `SUPABASE_SECRET_KEY` | Yalnızca Next.js sunucusunda kullanılan yönetim anahtarı |
| `OPENAI_API_KEY` | Yalnızca sunucuda kullanılan OpenAI anahtarı |

`SUPABASE_SECRET_KEY` ve `OPENAI_API_KEY` asla GitHub'a eklenmemeli veya tarayıcıya gönderilmemelidir.

## Kontroller

```bash
npm run lint
npm run test
npm run build
```

## Netlify ile yayınlama

Bu portföy/beta proje Netlify'nin ücretsiz planı ile yayımlanabilir. GitHub
deposunu Netlify'a bağladıktan sonra aşağıdaki ortam değişkenlerini Netlify
proje ayarlarına ekle:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `OPENAI_API_KEY`

`SUPABASE_SECRET_KEY` ve `OPENAI_API_KEY` yalnızca Netlify'ın sunucu
ortamında kalmalıdır; `NEXT_PUBLIC_` önekiyle eklenmemelidir.

Ardından Supabase Authentication ayarlarında Netlify alan adını hem `Site
URL` hem de `Redirect URLs` listesine ekle. Böylece e-posta onayı ve şifre
sıfırlama bağlantıları doğru adrese döner.

### Trafik ve maliyet koruması

- Ücretsiz Netlify planı portföy ve küçük beta trafiği içindir. Aylık kullanım
  limiti dolarsa site geçici olarak duraklatılabilir; Netlify kullanım
  ekranından takip et.
- Supabase ücretsiz planındaki veritabanı, depolama ve trafik kotalarını
  düzenli kontrol et.
- OpenAI maliyetini sınırlamak için günlük kullanıcı bazlı AI limiti vardır.
  Canlıya çıkmadan önce aşağıdaki migration'ı Supabase SQL Editor'da bir kez
  çalıştır: `supabase/migrations/20260912100000_add_ai_usage_limits.sql`.
- Geniş kitleye açmadan önce kayıt ekranına CAPTCHA/IP tabanlı oran sınırlama
  eklenmelidir. Kullanıcı başına limit, çok sayıda yeni hesap oluşturan bir
  saldırganı tek başına engellemez.

## Gizlilik notu

POP ile yapılan konuşmalar ve ana görev teslimleri, değerlendirme veya yanıt üretimi için OpenAI API'ye gönderilebilir. Kullanıcılar parola, kimlik numarası ya da hassas kişisel verilerini bu alanlara yazmamalıdır.

## Lisans

Bu proje [MIT License](LICENSE) ile lisanslanmıştır.

# Mindpop Akademi e-posta şablonları

Bu kaynak dosyalar, Supabase Auth e-posta şablonlarının proje içindeki güncel kopyasıdır.

Supabase Dashboard → **Authentication** → **Email Templates** ekranında aşağıdaki alanları güncelle:

| Şablon | Konu | İçerik dosyası |
| --- | --- | --- |
| Confirm signup | `Mindpop Akademi e-posta adresini doğrula` | `confirmation.html` |
| Reset password | `Mindpop Akademi şifre yenileme bağlantın` | `recovery.html` |

Her iki şablonda da Supabase'in güvenli yönlendirme değişkeni olan `{{ .ConfirmationURL }}` kullanılır. Şablonları kaydettikten sonra bir test hesabıyla onay ve şifre yenileme bağlantılarını kontrol et.

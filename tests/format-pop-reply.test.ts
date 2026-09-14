import { describe, expect, it } from "vitest";
import { formatPopReply } from "../lib/ai/format-pop-reply";

describe("formatPopReply", () => {
  it("Markdown başlığı temizler, listeyi okunabilir maddelere dönüştürür", () => {
    const reply = "## Bugünkü plan\n- İlk adımı tamamla\n- Sonucu kontrol et";

    expect(formatPopReply(reply)).toBe(
      "Bugünkü plan\n• İlk adımı tamamla\n• Sonucu kontrol et",
    );
  });

  it("kalın vurgu ve kod bloklarını temizler", () => {
    const reply = "**Harika!**\n```text\nBir sonraki göreve geç.\n```";

    expect(formatPopReply(reply)).toBe("Harika!\nBir sonraki göreve geç.");
  });

  it("üçten fazla boş satırı iki boş satıra indirir", () => {
    expect(formatPopReply("İlk mesaj\n\n\n\nİkinci mesaj")).toBe(
      "İlk mesaj\n\nİkinci mesaj",
    );
  });
});

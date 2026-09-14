"use client";

import BodyText from "./BodyText";
import Button from "./button";
import SectionTitle from "./SectionTitle";
import { useState } from "react";

type ShareProgressCardProps = {
  title: string;
  text: string;
  onShare?: () => void;
};

export default function ShareProgressCard({
  title,
  text,
  onShare,
}: ShareProgressCardProps) {
  const [shareMessage, setShareMessage] = useState("");
  const [manualShareText, setManualShareText] = useState("");

  async function copyShareText(value: string) {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return true;
    }

    const textArea = document.createElement("textarea");
    textArea.value = value;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.select();

    const copied = document.execCommand("copy");
    document.body.removeChild(textArea);

    return copied;
  }

  async function handleShare() {
    const shareText = `${title} — ${text}\n${window.location.href}`;

    setShareMessage("");
    setManualShareText("");

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Mindpop Akademi",
          text: `${title} — ${text}`,
          url: window.location.href,
        });

        setShareMessage("İlerlemen paylaşıldı!");
        return;
      }
    } catch (error) {
      // Kullanıcı paylaşım penceresini kapatırsa hata mesajı göstermiyoruz.
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
    }

    try {
      const copied = await copyShareText(shareText);

      if (copied) {
        setShareMessage("Bağlantı panoya kopyalandı!");
        return;
      }
    } catch {
      // Sonraki adımda kopyalanabilir metni kullanıcıya gösteririz.
    }

    setShareMessage("Bağlantıyı buradan kopyalayabilirsin:");
    setManualShareText(shareText);
  }

  return (
    <section className="app-card-soft app-card-feature w-full">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <SectionTitle as="h3" title={title} />

          <BodyText size="sm" tone="default" weight="semibold" className="mt-2">
            {text}
          </BodyText>
        </div>

        <Button
          variant="gold"
          onClick={onShare ?? handleShare}
          className="shrink-0"
        >
          Paylaş
        </Button>
      </div>

      {shareMessage && (
        <div className="mt-4">
          <BodyText as="p" size="xs" tone="muted" weight="normal">
            {shareMessage}
          </BodyText>

          {manualShareText && (
            <textarea
              readOnly
              value={manualShareText}
              onFocus={(event) => event.currentTarget.select()}
              className="mt-2 min-h-20 w-full rounded-card border-card bg-white p-3 font-body text-sm text-black outline-none"
              aria-label="Paylaşılacak bağlantı"
            />
          )}
        </div>
      )}
    </section>
  );
}

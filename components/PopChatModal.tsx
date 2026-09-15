"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import BodyText from "./BodyText";
import Button from "./button";
import Modal from "./Modal";
import ProcessingOverlay from "./ProcessingOverlay";

type PopChatModalProps = {
  open: boolean;
  onClose: () => void;
  mode?: "onboarding" | "regular";
};

type ChatMessage = {
  role: "pop" | "user";
  content: string;
};

type OnboardingStatus = "collecting" | "ready" | null;

async function readJsonResponse<T>(response: Response): Promise<T> {
  const responseText = await response.text();

  try {
    return JSON.parse(responseText) as T;
  } catch {
    console.error("Geçersiz API yanıtı:", {
      status: response.status,
      body: responseText.slice(0, 500),
    });

    throw new Error(
      "Yol haritası sunucudan tamamlanmış bir yanıt alınamadan durdu. Lütfen tekrar dene.",
    );
  }
}

export default function PopChatModal({
  open,
  onClose,
  mode = "regular",
}: PopChatModalProps) {
  const defaultWelcomeMessage =
    mode === "onboarding"
      ? "Mindpop Akademi’ye hoş geldin! Seni tanımak için birkaç kısa soru soracağım."
      : "Merhaba! Bugün hangi konuda birlikte çalışmak istersin?";

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "pop",
      content: defaultWelcomeMessage,
    },
  ]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [conversationId, setConversationId] = useState<number | null>(null);

  const [isStartingConversation, setIsStartingConversation] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);
  const [isRevisingRoadmap, setIsRevisingRoadmap] = useState(false);

  const [onboardingStatus, setOnboardingStatus] =
    useState<OnboardingStatus>(null);
  const [roadmapSummary, setRoadmapSummary] = useState<string | null>(null);

  const hasRequestedConversation = useRef(false);

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function openConversation() {
      if (!open || conversationId || hasRequestedConversation.current) {
        return;
      }

      hasRequestedConversation.current = true;
      setIsStartingConversation(true);
      setError("");

      try {
        // Onboarding kendi kalıcı oturumunu ve hedefe özel ilk mesajını kullanır.
        if (mode === "onboarding") {
          const response = await fetch("/api/onboarding/start", {
            method: "POST",
          });

          const result = (await response.json()) as {
            success: boolean;
            onboarding?: {
              conversationId: number;
              status: OnboardingStatus;
              roadmapSummary: string | null;
            };
            messages?: ChatMessage[];
            error?: string;
          };

          if (!response.ok || !result.success || !result.onboarding) {
            throw new Error(result.error ?? "Onboarding açılamadı.");
          }

          setConversationId(result.onboarding.conversationId);
          setOnboardingStatus(result.onboarding.status);
          setRoadmapSummary(result.onboarding.roadmapSummary);

          if (result.messages && result.messages.length > 0) {
            setMessages(result.messages);
          }

          return;
        }

        // Normal POP sohbeti önce eski mesajları yükler.
        const historyResponse = await fetch("/api/pop/conversations");
        const historyResult = (await historyResponse.json()) as {
          success: boolean;
          messages?: ChatMessage[];
          error?: string;
        };

        if (
          !historyResponse.ok ||
          !historyResult.success ||
          !historyResult.messages
        ) {
          throw new Error(historyResult.error ?? "POP geçmişi okunamadı.");
        }

        if (historyResult.messages.length > 0) {
          setMessages(historyResult.messages);
        }

        // Bu sayfa oturumu için yeni normal POP konuşması açar.
        const conversationResponse = await fetch("/api/pop/conversations", {
          method: "POST",
        });

        const conversationResult = (await conversationResponse.json()) as {
          success: boolean;
          conversation?: {
            id: number;
          };
          error?: string;
        };

        if (
          !conversationResponse.ok ||
          !conversationResult.success ||
          !conversationResult.conversation
        ) {
          throw new Error(
            conversationResult.error ?? "POP konuşması açılamadı.",
          );
        }

        setConversationId(conversationResult.conversation.id);
      } catch (error) {
        hasRequestedConversation.current = false;

        setError(
          error instanceof Error
            ? error.message
            : "POP konuşması açılamadı. Lütfen tekrar dene.",
        );
      } finally {
        setIsStartingConversation(false);
      }
    }

    void openConversation();
  }, [open, conversationId, mode]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanMessage = message.trim();

    if (
      !cleanMessage ||
      !conversationId ||
      isSending ||
      isGeneratingRoadmap ||
      isRevisingRoadmap ||
      onboardingStatus === "ready"
    ) {
      return;
    }

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        role: "user",
        content: cleanMessage,
      },
    ]);

    setMessage("");
    setError("");
    setIsSending(true);

    try {
      const endpoint =
        mode === "onboarding" ? "/api/onboarding/reply" : "/api/pop/message";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: cleanMessage,
          conversationId,
        }),
      });

      const result = (await response.json()) as {
        success: boolean;
        reply?: string;
        status?: OnboardingStatus;
        roadmapSummary?: string | null;
        error?: string;
      };

      if (!response.ok || !result.success || !result.reply) {
        throw new Error(result.error ?? "POP yanıt veremedi.");
      }

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          role: "pop",
          content: result.reply!,
        },
      ]);

      if (mode === "onboarding") {
        setOnboardingStatus(result.status ?? "collecting");
        setRoadmapSummary(result.roadmapSummary ?? null);
      }
    } catch (error) {
      setMessage(cleanMessage);
      setError(
        error instanceof Error
          ? error.message
          : "POP yanıt veremedi. Lütfen tekrar dene.",
      );
    } finally {
      setIsSending(false);
    }
  }

  async function handleGenerateRoadmap() {
    if (
      mode !== "onboarding" ||
      onboardingStatus !== "ready" ||
      !conversationId ||
      isGeneratingRoadmap
    ) {
      return;
    }

    setError("");
    setIsGeneratingRoadmap(true);

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      const goalPrompt = user?.user_metadata.learning_goal;

      if (userError || typeof goalPrompt !== "string") {
        throw new Error("Öğrenme hedefin bulunamadı.");
      }

      const response = await fetch("/api/journeys/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          goalPrompt,
          onboardingConversationId: conversationId,
        }),
      });

      const result = await readJsonResponse<{
        success: boolean;
        error?: string;
      }>(response);

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Yol haritası oluşturulamadı.");
      }

      onClose();
      window.location.assign("/dashboard");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Yol haritası oluşturulamadı. Lütfen tekrar dene.",
      );
    } finally {
      setIsGeneratingRoadmap(false);
    }
  }

  async function handleReviseRoadmap() {
    if (
      mode !== "onboarding" ||
      onboardingStatus !== "ready" ||
      !conversationId ||
      isRevisingRoadmap
    ) {
      return;
    }

    setError("");
    setIsRevisingRoadmap(true);

    try {
      const response = await fetch("/api/onboarding/revise", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId,
        }),
      });

      const result = (await response.json()) as {
        success: boolean;
        reply?: string;
        error?: string;
      };

      if (!response.ok || !result.success || !result.reply) {
        throw new Error(result.error ?? "Onboarding düzenlemeye açılamadı.");
      }

      setOnboardingStatus("collecting");
      setRoadmapSummary(null);

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          role: "pop",
          content: result.reply!,
        },
      ]);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Onboarding düzenlemeye açılamadı. Lütfen tekrar dene.",
      );
    } finally {
      setIsRevisingRoadmap(false);
    }
  }

  const isReadyForApproval =
    mode === "onboarding" && onboardingStatus === "ready";

  useEffect(() => {
    if (!open) {
      return;
    }

    const container = messagesContainerRef.current;

    if (!container) {
      return;
    }

    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
  }, [open, messages.length, isSending]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      headerIcon={
        <Image
          src="/images/pop-icon/el-sallayan-icon.png"
          alt="POP"
          width={72}
          height={72}
          unoptimized
          className="h-10 w-auto shrink-0 object-contain sm:h-14"
        />
      }
      title={
        mode === "onboarding" ? "POP seni tanımak istiyor" : "POP ile Konuş"
      }
    >
      <div className="flex min-h-120 flex-col">
        <div className="flex items-start gap-2 sm:gap-4">
          <div
            ref={messagesContainerRef}
            className="max-h-90 flex-1 space-y-3 overflow-y-auto pr-1"
          >
            {messages.map((chatMessage, index) => (
              <div
                key={`${chatMessage.role}-${index}`}
                className={
                  chatMessage.role === "pop"
                    ? "mr-6 rounded-card bg-cream p-3 "
                    : "ml-6 rounded-card bg-main-purple p-3 text-white"
                }
              >
                <BodyText
                  size="sm"
                  tone={chatMessage.role === "pop" ? "default" : "inverse"}
                  weight="semibold"
                  className="whitespace-pre-line"
                >
                  {chatMessage.content}
                </BodyText>
              </div>
            ))}

            {isSending && (
              <div className="mr-6 rounded-card bg-cream p-4">
                <BodyText size="sm" tone="muted" weight="semibold">
                  POP düşünüyor...
                </BodyText>
              </div>
            )}
          </div>
        </div>

        {isReadyForApproval && (
          <div className="mt-4 rounded-card bg-cream p-4">
            <BodyText size="sm" tone="default" weight="semibold">
              Yol haritası özeti
            </BodyText>

            <BodyText
              size="sm"
              tone="muted"
              weight="normal"
              className="mt-2 whitespace-pre-line"
            >
              {roadmapSummary}
            </BodyText>

            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                type="button"
                variant="gold"
                disabled={isGeneratingRoadmap || isRevisingRoadmap}
                onClick={handleGenerateRoadmap}
              >
                {isGeneratingRoadmap ? "Hazırlanıyor..." : "Onaylıyorum"}
              </Button>

              <Button
                type="button"
                variant="secondary"
                disabled={isGeneratingRoadmap || isRevisingRoadmap}
                onClick={handleReviseRoadmap}
              >
                {isRevisingRoadmap ? "Hazırlanıyor..." : "Düzenlemek İstiyorum"}
              </Button>
            </div>
          </div>
        )}

        {!isReadyForApproval && (
          <form
            onSubmit={handleSubmit}
            className="mt-auto border-t border-beige pt-4"
          >
            <label htmlFor="pop-message" className="sr-only">
              POP’a mesaj yaz
            </label>

            <div className="flex gap-3">
              <input
                id="pop-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength={600}
                disabled={
                  isSending ||
                  isStartingConversation ||
                  isGeneratingRoadmap ||
                  isRevisingRoadmap
                }
                placeholder="Yanıtını yaz..."
                className="min-w-0 flex-1 rounded-button border-card bg-white px-4 py-3 font-body text-sm text-black outline-none placeholder:text-grey focus:border-main-purple disabled:cursor-not-allowed disabled:opacity-60"
              />

              <Button
                type="submit"
                variant="primary"
                disabled={
                  isSending ||
                  isStartingConversation ||
                  isGeneratingRoadmap ||
                  isRevisingRoadmap ||
                  !conversationId ||
                  !message.trim()
                }
              >
                {isStartingConversation
                  ? "Hazırlanıyor..."
                  : isSending
                    ? "Düşünüyor..."
                    : "Gönder"}
              </Button>
            </div>
          </form>
        )}

        {error && (
          <p className="mt-3 font-body text-xs text-red-600" role="alert">
            {error}
          </p>
        )}

        <BodyText size="xs" tone="muted" weight="normal" className="mt-3">
          POP yanıtları yapay zeka tarafından oluşturulur; önemli kararları
          kendi değerlendirmenle ver.
        </BodyText>
      </div>

      {(isGeneratingRoadmap || isRevisingRoadmap) && (
        <ProcessingOverlay
          title={
            isGeneratingRoadmap
              ? "Yol haritan hazırlanıyor"
              : "Yol haritası güncelleniyor"
          }
          description={
            isGeneratingRoadmap
              ? "POP hedefini, seviyeni ve çalışma koşullarını dikkate alarak beş dünyalık planını oluşturuyor."
              : "POP istediğin değişiklikleri yol haritası konuşmana ekliyor."
          }
        />
      )}
    </Modal>
  );
}
